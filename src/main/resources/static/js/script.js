const EPSILON = 1e-9;

const CANVAS_WIDTH = 1604;
const CANVAS_HEIGHT = 651;

const FIELD_WIDTH = 886;
const FIELD_HEIGHT = 360;

const XOFFSET = 15 * 12;
const YOFFSET = 10 * 12;

const SCALE_FACTOR = 2 / 3;

const WAYPOINT_SIZE = 10;

/**
 * @type CanvasRenderingContext2D
 */
let fieldCtx;

let backgroundCtx;
let backgroundImage;

let waypoints = [];
let waypointTable;

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    length() {
        return Math.hypot(this.x, this.y);
    }

    subtract(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }
}

class Rotation2 {
    constructor(x, y, normalize) {
        if (normalize) {
            let length = Math.hypot(x, y);

            if (length > EPSILON) {
                this.cos = x / length;
                this.sin = y / length;
            } else {
                this.cos = 1.0;
                this.sin = 0.0;
            }
        } else {
            this.cos = x;
            this.sin = y;
        }

        this.normalize = normalize;
    }

    static fromDegrees(degrees) {
        return Rotation2.fromRadians(degrees * (Math.PI / 180.0));
    }

    static fromRadians(radians) {
        return new Rotation2(Math.cos(radians), Math.sin(radians), false);
    }

    toDegrees() {
        return this.toRadians() * (180.0 / Math.PI);
    }

    toRadians() {
        let angle = Math.atan2(this.sin, this.cos);

        if (angle < 0) {
            return angle + 2 * Math.PI;
        }

        return angle;
    }
}

class Waypoint {
    constructor(position, heading, rotation) {
        this.position = position;
        this.heading = heading;
        if (rotation) {
            this.rotation = rotation;
        } else {
            this.rotation = heading;
        }
    }
}

function sendRequest(endpoint, method, parameters, body) {
    // Format the url for the request
    let url = `/api${endpoint}`;

    // Create the query string
    let queryString = parameters.map((param, index, array) => {
        // All names and values are url-encoded
        return `${encodeURIComponent(param.name)}=${encodeURIComponent(param.value)}`;
    }).join('&');

    // Add the query string to the url if present
    if (queryString) {
        url += '?' + queryString;
    }

    // Make the request
    return fetch(url, {
        method: method,
        body: body
    });
}

function setupCanvases() {
    let field = document.getElementById("field");
    let background = document.getElementById("background");

    let widthString = (CANVAS_WIDTH * SCALE_FACTOR) + "px";
    let heightString = (CANVAS_HEIGHT * SCALE_FACTOR) + "px";

    field.style.width = widthString;
    field.style.height = heightString;
    background.style.width = widthString;
    background.style.height = heightString;
    canvases.style.width = widthString;
    canvases.style.height = heightString;

    fieldCtx = field.getContext("2d");

    fieldCtx.canvas.width = CANVAS_WIDTH;
    fieldCtx.canvas.height = CANVAS_HEIGHT;
    fieldCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    fieldCtx.fillStyle = "#A0A";
    fieldCtx.strokeStyle = "#0A0";
    fieldCtx.lineWidth = 5.0;

    backgroundCtx = background.getContext("2d");
    backgroundCtx.canvas.width = CANVAS_WIDTH;
    backgroundCtx.canvas.height = CANVAS_HEIGHT;
    backgroundCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    backgroundImage = new Image();
    backgroundImage.src = "/images/field.png";
    backgroundImage.onload = () => {
        backgroundCtx.drawImage(backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    };

    field.ondblclick = fieldDblClickHandler;
}

function toScreenCoordinates(vector) {
    return new Vector2(
        (vector.y + YOFFSET) * (CANVAS_HEIGHT / FIELD_HEIGHT),
        (vector.x + XOFFSET) * (CANVAS_WIDTH / FIELD_WIDTH)
    );
}

function toFieldCoordinates(vector) {
    return new Vector2(
        vector.y * (FIELD_WIDTH / CANVAS_WIDTH) - XOFFSET,
        vector.x * (FIELD_HEIGHT / CANVAS_HEIGHT) - YOFFSET
    );
}

function updateWaypointArray() {
    waypoints = [];

    waypointTable.querySelectorAll("tr").forEach((elem, index) => {
        let x = parseFloat(elem.querySelector(".x input").value);
        let y = parseFloat(elem.querySelector(".y input").value);
        let heading = parseFloat(elem.querySelector(".heading input").value);
        let rotation = parseFloat(elem.querySelectorAll(".rotation input")[0].value);
        let useRotation  = elem.querySelectorAll(".rotation input")[1].checked;

        if (index === 0 || index === waypointTable.childElementCount - 1) {
            useRotation = true;
        }

        waypoints.push(new Waypoint(new Vector2(x, y), Rotation2.fromDegrees(heading), useRotation ? Rotation2.fromDegrees(rotation) : null));
    });
}

/**
 * Appends another entry to the waypoint table
 */
function addWaypoint(waypoint) {
    if (!waypoint) {
        if (waypoints.length > 0) {
            waypoint = waypoints[waypoints.length - 1];
        } else {
            waypoint = new Waypoint(new Vector2(0, 0), Rotation2.fromDegrees(90));
        }
    }

    let row = document.createElement("tr");

    // Create the x column
    {
        let xElem = document.createElement("td");
        xElem.classList.add("x");

        let xInput = document.createElement("input");
        xInput.type = "number";
        xInput.value = waypoint.position.x;
        xInput.step = "any";
        xElem.appendChild(xInput);

        row.appendChild(xElem);
    }

    // Create the y column
    {
        let yElem = document.createElement("td");
        yElem.classList.add("y");

        let yInput = document.createElement("input");
        yInput.type = "number";
        yInput.value = waypoint.position.y;
        yInput.step = "any";
        yElem.appendChild(yInput);

        row.appendChild(yElem);
    }

    // Create the heading column
    {
        let elem = document.createElement("td");
        elem.classList.add("heading");

        let input = document.createElement("input");
        input.type = "number";
        input.value = waypoint.heading.toDegrees();
        input.step = "any";
        elem.appendChild(input);

        row.appendChild(elem);
    }

    // Create the rotation column
    {
        let elem = document.createElement("td");
        elem.classList.add("rotation");

        let input = document.createElement("input");
        input.type = "number";
        input.value = waypoint.rotation.toDegrees();
        input.step = "any";
        elem.appendChild(input);

        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = false;
        elem.appendChild(checkbox);

        row.appendChild(elem);
    }

    // Create the deletion button
    {
        let elem = document.createElement("td");
        elem.classList.add("delete");

        let button = document.createElement("button");
        button.innerHTML = "&times;";
        elem.appendChild(button);

        row.appendChild(elem);
    }

    waypointTable.appendChild(row);

    updateWaypointArray();
}

function update() {
    updateWaypointArray();

    fieldCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    sendRequest("/generate", "POST", [], JSON.stringify(waypoints))
    .then(response => {
            return response.json();
    }).then(json => {
            fieldCtx.beginPath();
            json.segments.forEach((item, index) => {
                let start = toScreenCoordinates(item.start);
                let end = toScreenCoordinates(item.end);

                fieldCtx.moveTo(start.x, start.y);
                fieldCtx.lineTo(end.x, end.y);
            });
            fieldCtx.stroke();
    }).then(() => {
        waypoints.forEach(waypoint => {
            let screenPos = toScreenCoordinates(waypoint.position);
            
            fieldCtx.beginPath();
            fieldCtx.ellipse(screenPos.x, screenPos.y, WAYPOINT_SIZE / 2, WAYPOINT_SIZE / 2, 0, 0, 2 * Math.PI);
            fieldCtx.fill();
        });
    });
}

function fieldClickHandler(event) {
    updateWaypointArray();

    let screenPos = new Vector2(event.offsetX / SCALE_FACTOR, event.offsetY / SCALE_FACTOR);

    let fieldPos = toFieldCoordinates(screenPos);

    let closestIndex = 0;
    let closestDelta = Number.POSITIVE_INFINITY;
    let closestWaypoint;

    waypoints.forEach((waypoint, index) => {
        let delta = waypoint.position.subtract(fieldPos).length();

        if (delta < closestDelta) {
            closestDelta = delta;
            closestIndex = index;
            closestWaypoint = waypoint;
        }
    });
}

function fieldDblClickHandler(event) {
    let screenPos = new Vector2(event.offsetX / SCALE_FACTOR, event.offsetY / SCALE_FACTOR);

    let fieldPos = toFieldCoordinates(screenPos);

    let waypoint = new Waypoint(fieldPos, Rotation2.fromDegrees(90));

    addWaypoint(waypoint);

    update();
}

document.addEventListener("DOMContentLoaded", () => {
    setupCanvases();

    waypointTable = document.getElementById("waypoint-table");
});
