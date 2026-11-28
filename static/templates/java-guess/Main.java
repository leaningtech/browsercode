import java.util.Random;
import java.util.Scanner;

public class Main {
	public static void main(String[] args) {
		int secret = new Random().nextInt(100) + 1;
		Scanner in = new Scanner(System.in);
		System.out.println("I'm thinking of a number between 1 and 100.");

		int guesses = 0;
		while (true) {
			System.out.print("Your guess: ");
			// Ctrl+D in the Output tab ends System.in.
			if (!in.hasNextLine()) {
				System.out.println();
				System.out.println("Giving up? The number was " + secret + ".");
				return;
			}
			String line = in.nextLine().trim();
			int guess;
			try {
				guess = Integer.parseInt(line);
			} catch (NumberFormatException e) {
				System.out.println("\"" + line + "\" isn't a whole number.");
				continue;
			}

			guesses++;
			if (guess < secret) {
				System.out.println("Too low.");
			} else if (guess > secret) {
				System.out.println("Too high.");
			} else {
				System.out.println("Got it in " + guesses + (guesses == 1 ? " guess!" : " guesses!"));
				return;
			}
		}
	}
}