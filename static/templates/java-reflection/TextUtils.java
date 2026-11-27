/** The code under test. */
public class TextUtils {
	static String reverse(String text) {
		return new StringBuilder(text).reverse().toString();
	}

	static boolean isPalindrome(String text) {
		return text.equals(reverse(text));
	}

	static String capitalize(String text) {
		StringBuilder result = new StringBuilder();
		for (String word : text.split(" ")) {
			if (result.length() > 0) {
				result.append(' ');
			}
			if (!word.isEmpty()) {
				result.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
			}
		}
		return result.toString();
	}
}