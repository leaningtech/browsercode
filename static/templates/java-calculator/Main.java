import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.GridLayout;
import java.math.BigDecimal;
import java.math.MathContext;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;

/**
 * A pocket calculator. It does its sums in BigDecimal rather than double, so 0.1 + 0.2 shows 0.3
 * instead of 0.30000000000000004.
 */
public class Main {
	static final String[] KEYS = {
		"7", "8", "9", "/",
		"4", "5", "6", "*",
		"1", "2", "3", "-",
		"0", ".", "=", "+"
	};

	final JTextField display = new JTextField("0");
	BigDecimal total = BigDecimal.ZERO;
	/** The operator waiting for its second number, or null. */
	String operator;
	/** Whether the next digit starts a new number rather than extending the one shown. */
	boolean startNew = true;
	/** Set while the display shows Error, after a division by zero. */
	boolean error;

	Main() {
		JFrame frame = new JFrame("Calculator");
		display.setEditable(false);
		display.setHorizontalAlignment(JTextField.RIGHT);
		display.setFont(new Font("Monospaced", Font.PLAIN, 28));

		JButton clear = new JButton("C");
		clear.addActionListener(e -> clear());
		JPanel top = new JPanel(new BorderLayout());
		top.add(display, BorderLayout.CENTER);
		top.add(clear, BorderLayout.EAST);

		JPanel keys = new JPanel(new GridLayout(4, 4, 4, 4));
		for (String key : KEYS) {
			JButton button = new JButton(key);
			button.setFont(new Font("SansSerif", Font.PLAIN, 20));
			button.setPreferredSize(new Dimension(60, 52));
			button.addActionListener(e -> press(key));
			keys.add(button);
		}

		frame.add(top, BorderLayout.NORTH);
		frame.add(keys, BorderLayout.CENTER);
		frame.pack();
		frame.setLocationRelativeTo(null);
		frame.setVisible(true);
	}

	void press(String key) {
		if (error) {
			clear();
		}
		if (Character.isDigit(key.charAt(0))) {
			display.setText(startNew || display.getText().equals("0") ? key : display.getText() + key);
			startNew = false;
		} else if (key.equals(".")) {
			if (startNew) {
				display.setText("0.");
			} else if (!display.getText().contains(".")) {
				display.setText(display.getText() + ".");
			}
			startNew = false;
		} else {
			// A second operator in a row replaces the first rather than using the total twice.
			if (!startNew || operator == null) {
				calculate();
			}
			operator = key.equals("=") ? null : key;
			startNew = true;
		}
	}

	void calculate() {
		BigDecimal shown = new BigDecimal(display.getText());
		if (operator == null) {
			total = shown;
			return;
		}
		switch (operator) {
			case "+":
				total = total.add(shown);
				break;
			case "-":
				total = total.subtract(shown);
				break;
			case "*":
				total = total.multiply(shown);
				break;
			case "/":
				if (shown.signum() == 0) {
					clear();
					error = true;
					display.setText("Error");
					return;
				}
				total = total.divide(shown, MathContext.DECIMAL64);
				break;
		}
		display.setText(total.stripTrailingZeros().toPlainString());
	}

	void clear() {
		total = BigDecimal.ZERO;
		operator = null;
		startNew = true;
		error = false;
		display.setText("0");
	}

	public static void main(String[] args) {
		SwingUtilities.invokeLater(Main::new);
	}
}