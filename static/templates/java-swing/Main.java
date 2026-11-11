import java.awt.Font;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.SwingUtilities;

class Main implements Runnable {
	public static void main(String[] args) {
		SwingUtilities.invokeLater(new Main());
	}

	public void run() {
		JFrame f = new JFrame("Swing example");
		JLabel l = new JLabel("Hello, world!");
		l.setFont(new Font("Serif", Font.PLAIN, 42));
		f.add(l);
		f.pack();
		f.setLocationRelativeTo(null);
		f.setVisible(true);
	}
}
