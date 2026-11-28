import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Comparator;

/**
 * A tiny JUnit: it uses reflection to find every method marked @Test in a class, creates the
 * class, and calls each one. It never names a test method itself.
 */
public class Main {
	public static void main(String[] args) throws ReflectiveOperationException {
		int failed = run(TextUtilsTest.class);
		// A non-zero exit code is how build tools and CI know tests failed.
		System.exit(failed == 0 ? 0 : 1);
	}

	static int run(Class<?> testClass) throws ReflectiveOperationException {
		System.out.println("Running " + testClass.getName());
		Method[] methods = testClass.getDeclaredMethods();
		// The JVM lists methods in no particular order.
		Arrays.sort(methods, Comparator.comparing(Method::getName));

		int passed = 0;
		int failed = 0;
		for (Method method : methods) {
			Test test = method.getAnnotation(Test.class);
			if (test == null) {
				continue;
			}
			String name = test.value().isEmpty() ? method.getName() : test.value();
			// A fresh instance for every test, as JUnit makes, so one test can't affect another.
			Object instance = testClass.getDeclaredConstructor().newInstance();
			try {
				method.invoke(instance);
				passed++;
				System.out.println("  PASS  " + name);
			} catch (InvocationTargetException e) {
				// invoke wraps whatever the test threw.
				failed++;
				System.out.println("  FAIL  " + name + ": " + e.getCause().getMessage());
			}
		}
		System.out.println(passed + " passed, " + failed + " failed");
		return failed;
	}
}