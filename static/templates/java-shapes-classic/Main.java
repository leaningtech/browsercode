// Java 8 to 17. Switch to Java 21 or later beside Run to see the same program written with a
// sealed interface, records and a pattern-matching switch.
import java.util.Arrays;
import java.util.List;

abstract class Shape {
	abstract double area();
}

class Circle extends Shape {
	final double radius;

	Circle(double radius) {
		this.radius = radius;
	}

	@Override
	double area() {
		return Math.PI * radius * radius;
	}

	@Override
	public String toString() {
		return "Circle[radius=" + radius + "]";
	}
}

class Rectangle extends Shape {
	final double width;
	final double height;

	Rectangle(double width, double height) {
		this.width = width;
		this.height = height;
	}

	@Override
	double area() {
		return width * height;
	}

	@Override
	public String toString() {
		return "Rectangle[width=" + width + ", height=" + height + "]";
	}
}

class Triangle extends Shape {
	final double base;
	final double height;

	Triangle(double base, double height) {
		this.base = base;
		this.height = height;
	}

	@Override
	double area() {
		return base * height / 2;
	}

	@Override
	public String toString() {
		return "Triangle[base=" + base + ", height=" + height + "]";
	}
}

public class Main {
	public static void main(String[] args) {
		List<Shape> shapes = Arrays.asList(new Circle(1.5), new Rectangle(3, 4), new Triangle(6, 2.5));
		for (Shape shape : shapes) {
			System.out.printf("%-36s area %6.2f%n", shape, shape.area());
		}
	}
}