import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Graphics;
import java.util.Random;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;

/**
 * Watches four sorting algorithms work. The sort runs on its own thread; after every step it
 * hands the Swing thread a copy of the array to draw, so drawing never races the sort.
 */
public class Main {
	static final int SIZE = 60;
	static final int DELAY_MS = 5;
	static final String[] SORTS = {"Bubble sort", "Insertion sort", "Merge sort", "Quicksort"};

	final int[] values = new int[SIZE];
	int comparisons;
	int writes;

	/** What the board draws, only touched on the Swing thread. */
	int[] shown = new int[SIZE];
	int highlightA = -1;
	int highlightB = -1;

	final JComboBox<String> choice = new JComboBox<>(SORTS);
	final JButton sort = new JButton("Sort");
	final JButton shuffle = new JButton("Shuffle");
	final JLabel status = new JLabel(" ");
	final JPanel board = new JPanel() {
		@Override
		protected void paintComponent(Graphics g) {
			super.paintComponent(g);
			double barWidth = (double) getWidth() / SIZE;
			for (int i = 0; i < SIZE; i++) {
				int x = (int) (i * barWidth);
				int width = Math.max(1, (int) ((i + 1) * barWidth) - x - 1);
				int height = shown[i] * getHeight() / SIZE;
				boolean active = i == highlightA || i == highlightB;
				g.setColor(active ? new Color(255, 120, 80) : new Color(90, 160, 255));
				g.fillRect(x, getHeight() - height, width, height);
			}
		}
	};

	Main() {
		JFrame frame = new JFrame("Sorting");
		board.setBackground(new Color(18, 20, 28));
		sort.addActionListener(e -> start((String) choice.getSelectedItem()));
		shuffle.addActionListener(e -> shuffle());

		JPanel controls = new JPanel();
		controls.add(choice);
		controls.add(sort);
		controls.add(shuffle);
		JPanel top = new JPanel(new BorderLayout());
		top.add(controls, BorderLayout.CENTER);
		top.add(status, BorderLayout.SOUTH);

		frame.add(top, BorderLayout.NORTH);
		frame.add(board, BorderLayout.CENTER);
		shuffle();
		frame.setSize(480, 360);
		frame.setExtendedState(JFrame.MAXIMIZED_BOTH);
		frame.setVisible(true);
	}

	void shuffle() {
		for (int i = 0; i < SIZE; i++) {
			values[i] = i + 1;
		}
		Random random = new Random();
		for (int i = SIZE - 1; i > 0; i--) {
			swapQuietly(i, random.nextInt(i + 1));
		}
		shown = values.clone();
		highlightA = highlightB = -1;
		status.setText("Pick a sort and press Sort");
		board.repaint();
	}

	void start(String name) {
		comparisons = 0;
		writes = 0;
		setRunning(true);
		new Thread(() -> {
			try {
				switch (name) {
					case "Bubble sort":
						bubbleSort();
						break;
					case "Insertion sort":
						insertionSort();
						break;
					case "Merge sort":
						mergeSort(0, SIZE - 1, new int[SIZE]);
						break;
					default:
						quicksort(0, SIZE - 1);
				}
				show(-1, -1);
			} catch (InterruptedException e) {
				return;
			}
			SwingUtilities.invokeLater(() -> setRunning(false));
		}).start();
	}

	void setRunning(boolean running) {
		choice.setEnabled(!running);
		sort.setEnabled(!running);
		shuffle.setEnabled(!running);
	}

	void bubbleSort() throws InterruptedException {
		for (int end = SIZE - 1; end > 0; end--) {
			boolean swapped = false;
			for (int i = 0; i < end; i++) {
				if (greater(i, i + 1)) {
					swap(i, i + 1);
					swapped = true;
				}
			}
			if (!swapped) {
				return;
			}
		}
	}

	void insertionSort() throws InterruptedException {
		for (int i = 1; i < SIZE; i++) {
			for (int j = i; j > 0 && greater(j - 1, j); j--) {
				swap(j - 1, j);
			}
		}
	}

	void mergeSort(int from, int to, int[] buffer) throws InterruptedException {
		if (from >= to) {
			return;
		}
		int middle = (from + to) / 2;
		mergeSort(from, middle, buffer);
		mergeSort(middle + 1, to, buffer);
		int left = from;
		int right = middle + 1;
		for (int k = from; k <= to; k++) {
			if (right > to || (left <= middle && !greater(left, right))) {
				buffer[k] = values[left++];
			} else {
				buffer[k] = values[right++];
			}
		}
		for (int k = from; k <= to; k++) {
			set(k, buffer[k]);
		}
	}

	/** Lomuto partitioning, with the last element of each range as the pivot. */
	void quicksort(int from, int to) throws InterruptedException {
		if (from >= to) {
			return;
		}
		int store = from;
		for (int i = from; i < to; i++) {
			if (greater(to, i)) {
				swap(i, store++);
			}
		}
		swap(store, to);
		quicksort(from, store - 1);
		quicksort(store + 1, to);
	}

	boolean greater(int i, int j) throws InterruptedException {
		comparisons++;
		show(i, j);
		return values[i] > values[j];
	}

	void swap(int i, int j) throws InterruptedException {
		swapQuietly(i, j);
		writes += 2;
		show(i, j);
	}

	void set(int i, int value) throws InterruptedException {
		values[i] = value;
		writes++;
		show(i, -1);
	}

	void swapQuietly(int i, int j) {
		int t = values[i];
		values[i] = values[j];
		values[j] = t;
	}

	/** Hands the Swing thread a snapshot to draw, then waits so the step can be seen. */
	void show(int a, int b) throws InterruptedException {
		int[] snapshot = values.clone();
		String counts = comparisons + " comparisons, " + writes + " writes";
		SwingUtilities.invokeLater(() -> {
			shown = snapshot;
			highlightA = a;
			highlightB = b;
			status.setText(counts);
			board.repaint();
		});
		Thread.sleep(DELAY_MS);
	}

	public static void main(String[] args) {
		SwingUtilities.invokeLater(Main::new);
	}
}