public class TextUtilsTest {
	@Test("reverses a word")
	void reverse() {
		Assert.assertEquals("olleh", TextUtils.reverse("hello"));
	}

	@Test("capitalizes every word")
	void capitalize() {
		Assert.assertEquals("Hello Big World", TextUtils.capitalize("hello big world"));
	}

	// Fails until isPalindrome ignores case. Fix TextUtils and run again.
	@Test("spots a palindrome whatever its case")
	void palindrome() {
		Assert.assertTrue(TextUtils.isPalindrome("Racecar"), "Racecar is a palindrome");
	}

	@Test
	void emptyText() {
		Assert.assertEquals("", TextUtils.capitalize(""));
	}

	/** Not a test: the runner skips methods without @Test. */
	void helper() {
	}
}