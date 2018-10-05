package org.frcteam2910.pathgenerator;

import com.google.gson.Gson;
import org.frcteam2910.common.control.Path;
import org.frcteam2910.common.control.SplinePathGenerator;
import org.frcteam2910.common.control.Waypoint;
import org.frcteam2910.common.math.RigidTransform2;
import org.frcteam2910.common.math.spline.HermiteSpline;
import org.frcteam2910.common.math.spline.Spline;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLDecoder;
import java.util.function.BiFunction;

@RestController
@RequestMapping("api")
public class ApiController {
	private final Gson gson = new Gson();

	@RequestMapping(value = "/generate")
	public Path generate(@RequestBody String body,
	                     @RequestParam(value = "quintic", defaultValue = "true") boolean quintic) {
		try {
			body = URLDecoder.decode(body, "UTF-8");
		} catch (Exception e) {
			e.printStackTrace();
		}

		Waypoint[] waypoints = gson.fromJson(body, Waypoint[].class);

		SplinePathGenerator generator = new SplinePathGenerator();

		BiFunction<RigidTransform2, RigidTransform2, Spline> splineFactory = HermiteSpline::cubic;
		if (quintic) {
			splineFactory = HermiteSpline::quintic;
		}

		Path path = generator.generate(splineFactory, waypoints);

		return path;
	}
}
