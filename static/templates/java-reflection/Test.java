import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a method for Main to run as a test, the way JUnit's @Test does. RUNTIME retention keeps
 * it in the compiled class, where reflection can see it; by default it would be dropped.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Test {
	/** What the test checks, printed in place of the method name. */
	String value() default "";
}