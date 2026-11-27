/** The checks a test makes. A failed one throws, which is how the runner tells it failed. */
public class Assert {
	static void assertEquals(Object expected, Object actual) {
		if (!expected.equals(actual)) {
			throw new AssertionError("expected <" + expected + "> but was <" + actual + ">");
		}
	}

	static void assertTrue(boolean condition, String message) {
		if (!condition) {
			throw new AssertionError(message);
		}
	}
}