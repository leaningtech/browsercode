import java.awt.Color;
import java.awt.Graphics;
import java.awt.event.ActionEvent;
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.Arrays;
import java.util.Random;
import javax.swing.AbstractAction;
import javax.swing.JComponent;
import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.KeyStroke;
import javax.swing.SwingUtilities;
import javax.swing.Timer;

/** Conway's Game of Life: a live cell survives with 2 or 3 neighbours, a dead one is born with 3. */
public class Main {
	static final int CELL = 10;
	/**
	 * A running program can't be stopped from the IDE, so a game that never settles still pauses
	 * after this many generations.
	 */
	static final int MAX_STEPS = 3000;

	final JFrame frame = new JFrame();
	final Timer timer = new Timer(80, e -> step());
	boolean[][] cells = new boolean[0][0];
	boolean[][] previous = cells;
	int generation;
	int stepsSincePlay;
	/** Whether a drag draws live cells or erases them, decided by the cell it started on. */
	boolean drawing;

	final JPanel board = new JPanel() {
		@Override
		protected void paintComponent(Graphics g) {
			super.paintComponent(g);
			g.setColor(new Color(110, 220, 150));
			for (int row = 0; row < cells.length; row++) {
				for (int col = 0; col < cells[row].length; col++) {
					if (cells[row][col]) {
						g.fillRect(col * CELL, row * CELL, CELL - 1, CELL - 1);
					}
				}
			}
		}
	};

	Main() {
		board.setBackground(new Color(18, 20, 28));
		// The window fills the screen, so the grid has as many cells as fit.
		board.addComponentListener(new ComponentAdapter() {
			@Override
			public void componentResized(ComponentEvent e) {
				resize(board.getHeight() / CELL, board.getWidth() / CELL);
			}
		});
		MouseAdapter pen = new MouseAdapter() {
			@Override
			public void mousePressed(MouseEvent e) {
				int row = e.getY() / CELL;
				int col = e.getX() / CELL;
				if (inside(row, col)) {
					drawing = !cells[row][col];
					paint(row, col);
				}
			}

			@Override
			public void mouseDragged(MouseEvent e) {
				paint(e.getY() / CELL, e.getX() / CELL);
			}
		};
		board.addMouseListener(pen);
		board.addMouseMotionListener(pen);
		bind("SPACE", this::playOrPause);
		bind("N", () -> {
			timer.stop();
			step();
		});
		bind("R", this::randomize);
		bind("C", () -> {
			timer.stop();
			cells = new boolean[cells.length][cells.length == 0 ? 0 : cells[0].length];
			generation = 0;
			board.repaint();
			updateTitle();
		});
		frame.add(board);
	}

	void bind(String key, Runnable action) {
		board.getInputMap(JComponent.WHEN_IN_FOCUSED_WINDOW).put(KeyStroke.getKeyStroke(key), key);
		board.getActionMap().put(key, new AbstractAction() {
			@Override
			public void actionPerformed(ActionEvent e) {
				action.run();
			}
		});
	}

	void resize(int rows, int cols) {
		// The window is resized again as it maximizes, so a random board that hasn't started yet is
		// filled again at the final size. Anything drawn by hand is kept.
		boolean refill = cells.length == 0 || (generation == 0 && timer.isRunning());
		boolean[][] resized = new boolean[rows][cols];
		for (int row = 0; row < Math.min(rows, cells.length); row++) {
			for (int col = 0; col < Math.min(cols, cells[row].length); col++) {
				resized[row][col] = cells[row][col];
			}
		}
		cells = resized;
		if (refill) {
			randomize();
		}
		board.repaint();
	}

	void randomize() {
		Random random = new Random();
		for (boolean[] row : cells) {
			for (int col = 0; col < row.length; col++) {
				row[col] = random.nextInt(4) == 0;
			}
		}
		generation = 0;
		play();
	}

	void paint(int row, int col) {
		if (inside(row, col)) {
			cells[row][col] = drawing;
			board.repaint();
		}
	}

	boolean inside(int row, int col) {
		return row >= 0 && row < cells.length && col >= 0 && col < cells[row].length;
	}

	void playOrPause() {
		if (timer.isRunning()) {
			timer.stop();
			updateTitle();
		} else {
			play();
		}
	}

	void play() {
		stepsSincePlay = 0;
		timer.start();
		updateTitle();
	}

	void step() {
		int rows = cells.length;
		int cols = rows == 0 ? 0 : cells[0].length;
		boolean[][] next = new boolean[rows][cols];
		for (int row = 0; row < rows; row++) {
			for (int col = 0; col < cols; col++) {
				int n = neighbours(row, col);
				next[row][col] = n == 3 || (n == 2 && cells[row][col]);
			}
		}
		// Still lifes repeat every generation and blinkers every other one: nothing more will happen.
		boolean settled = Arrays.deepEquals(next, cells) || Arrays.deepEquals(next, previous);
		previous = cells;
		cells = next;
		generation++;
		if (settled || ++stepsSincePlay >= MAX_STEPS) {
			timer.stop();
		}
		board.repaint();
		updateTitle();
	}

	int neighbours(int row, int col) {
		int count = 0;
		for (int dr = -1; dr <= 1; dr++) {
			for (int dc = -1; dc <= 1; dc++) {
				if ((dr != 0 || dc != 0) && inside(row + dr, col + dc) && cells[row + dr][col + dc]) {
					count++;
				}
			}
		}
		return count;
	}

	void updateTitle() {
		frame.setTitle("Generation " + generation + (timer.isRunning() ? "" : " (paused)"));
	}

	public static void main(String[] args) {
		System.out.println("Space: play or pause   N: one step   R: random   C: clear");
		System.out.println("Click or drag on the board to draw cells.");
		SwingUtilities.invokeLater(() -> {
			Main life = new Main();
			life.frame.setSize(480, 360);
			life.frame.setExtendedState(JFrame.MAXIMIZED_BOTH);
			life.frame.setVisible(true);
		});
	}
}