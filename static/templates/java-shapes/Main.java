// Java 21 and later. Switch to Java 17 or older beside Run to see the same program written with
// an abstract class instead.
import java.util.List;

sealed interface Shape permits Circle, Rectangle, Triangle {}

record Circle(double radius) implements Shape {}

record Rectangle(double width, double height) implements Shape {}

record Triangle(double base, double height) implements Shape {}

public class Main {
	static double area(Shape shape) {
		// No default branch: Shape is sealed, so the compiler knows these are all the cases and
		// rejects this switch if a new shape is added without one.
		return switch (shape) {
			case Circle(double r) -> Math.PI * r * r;
			case Rectangle(double w, double h) -> w * h;
			case Triangle(double b, double h) -> b * h / 2;
		};
	}

	public static void main(String[] args) {
		List<Shape> shapes = List.of(new Circle(1.5), new Rectangle(3, 4), new Triangle(6, 2.5));
		for (Shape shape : shapes) {
			System.out.printf("%-36s area %6.2f%n", shape, area(shape));
		}
	}
}