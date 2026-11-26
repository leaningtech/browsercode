import java.awt.BorderLayout;
import java.awt.Font;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTextField;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;

class Main implements Runnable {
	public static void main(String[] args) {
		SwingUtilities.invokeLater(new Main());
	}

	public void run() {
		JFrame f = new JFrame("Swing example");
		JLabel greeting = new JLabel("Hello, world!", SwingConstants.CENTER);
		greeting.setFont(new Font("Serif", Font.PLAIN, 42));

		JTextField name = new JTextField(12);
		JButton greet = new JButton("Greet");
		greet.addActionListener(e -> {
			String who = name.getText().trim();
			greeting.setText("Hello, " + (who.isEmpty() ? "world" : who) + "!");
		});

		JPanel controls = new JPanel();
		controls.add(new JLabel("Your name:"));
		controls.add(name);
		controls.add(greet);

		f.add(greeting, BorderLayout.CENTER);
		f.add(controls, BorderLayout.SOUTH);
		f.getRootPane().setDefaultButton(greet);
		f.pack();
		f.setLocationRelativeTo(null);
		f.setVisible(true);
	}
}