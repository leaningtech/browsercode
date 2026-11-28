import java.awt.Color;
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.image.BufferedImage;
import javax.swing.ImageIcon;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.SwingUtilities;

public class Main {
	static final int MAX_ITERATIONS = 256;

	final JLabel view = new JLabel();
	double centerX = -0.6;
	double centerY = 0;
	/** The width of one pixel on the complex plane, set to fit the whole set on the first draw. */
	double scale;

	Main() {
		view.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseClicked(MouseEvent e) {
				centerX += (e.getX() - view.getWidth() / 2) * scale;
				centerY += (e.getY() - view.getHeight() / 2) * scale;
				scale = SwingUtilities.isRightMouseButton(e) ? scale * 2 : scale / 2;
				render();
			}
		});
		// The window fills the screen, so the picture is drawn at whatever size that turns out to be.
		view.addComponentListener(new ComponentAdapter() {
			@Override
			public void componentResized(ComponentEvent e) {
				render();
			}
		});
	}

	void render() {
		int width = view.getWidth();
		int height = view.getHeight();
		if (width == 0 || height == 0) {
			return;
		}
		if (scale == 0) {
			scale = Math.max(3.4 / width, 2.6 / height);
		}
		BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
		for (int py = 0; py < height; py++) {
			for (int px = 0; px < width; px++) {
				double cr = centerX + (px - width / 2) * scale;
				double ci = centerY + (py - height / 2) * scale;
				double zr = 0;
				double zi = 0;
				int n = 0;
				while (n < MAX_ITERATIONS && zr * zr + zi * zi <= 4) {
					double next = zr * zr - zi * zi + cr;
					zi = 2 * zr * zi + ci;
					zr = next;
					n++;
				}
				int rgb = n == MAX_ITERATIONS ? 0 : Color.HSBtoRGB(0.6f + n / 48f, 0.75f, 1f);
				image.setRGB(px, py, rgb);
			}
		}
		view.setIcon(new ImageIcon(image));
	}

	public static void main(String[] args) {
		SwingUtilities.invokeLater(() -> {
			JFrame frame = new JFrame("Click to zoom in, right-click to zoom out");
			frame.add(new Main().view);
			frame.setSize(480, 360);
			frame.setExtendedState(JFrame.MAXIMIZED_BOTH);
			frame.setVisible(true);
		});
	}
}