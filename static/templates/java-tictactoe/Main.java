import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.GridLayout;
import java.util.Arrays;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;

/** You play X; the computer plays O with minimax, so the best you can do is a draw. */
public class Main {
	static final int[][] LINES = {
		{0, 1, 2}, {3, 4, 5}, {6, 7, 8},
		{0, 3, 6}, {1, 4, 7}, {2, 5, 8},
		{0, 4, 8}, {2, 4, 6}
	};
	static final char EMPTY = ' ';

	final char[] board = new char[9];
	final JButton[] squares = new JButton[9];
	final JLabel status = new JLabel("", SwingConstants.CENTER);

	Main() {
		JFrame frame = new JFrame("Tic-tac-toe");
		JPanel grid = new JPanel(new GridLayout(3, 3));
		for (int i = 0; i < 9; i++) {
			int square = i;
			squares[i] = new JButton();
			squares[i].setFont(new Font("SansSerif", Font.BOLD, 40));
			squares[i].setPreferredSize(new Dimension(90, 90));
			squares[i].addActionListener(e -> play(square));
			grid.add(squares[i]);
		}
		JButton newGame = new JButton("New game");
		newGame.addActionListener(e -> reset());
		status.setFont(new Font("SansSerif", Font.PLAIN, 16));

		frame.add(status, BorderLayout.NORTH);
		frame.add(grid, BorderLayout.CENTER);
		frame.add(newGame, BorderLayout.SOUTH);
		reset();
		frame.pack();
		frame.setLocationRelativeTo(null);
		frame.setVisible(true);
	}

	void reset() {
		Arrays.fill(board, EMPTY);
		for (JButton square : squares) {
			square.setText("");
			square.setForeground(Color.BLACK);
		}
		status.setText("Your move: you are X");
	}

	void play(int square) {
		if (board[square] != EMPTY || gameOver()) {
			return;
		}
		place(square, 'X');
		if (!gameOver()) {
			place(bestMove(), 'O');
		}
		if (winningLine() != null) {
			for (int i : winningLine()) {
				squares[i].setForeground(Color.RED);
			}
			status.setText(board[winningLine()[0]] == 'X' ? "You win!" : "The computer wins");
		} else if (full()) {
			status.setText("A draw");
		}
	}

	void place(int square, char player) {
		board[square] = player;
		squares[square].setText(String.valueOf(player));
	}

	/** The square where O scores best, assuming X then plays as well as possible too. */
	int bestMove() {
		int best = -1;
		int bestScore = Integer.MIN_VALUE;
		for (int i = 0; i < 9; i++) {
			if (board[i] == EMPTY) {
				board[i] = 'O';
				int score = minimax(false, 1);
				board[i] = EMPTY;
				if (score > bestScore) {
					bestScore = score;
					best = i;
				}
			}
		}
		return best;
	}

	/**
	 * Scores the board from O's side by trying every move to the end of the game: O picks the
	 * highest score, X the lowest. `depth` makes a quicker win, or a slower loss, score better.
	 */
	int minimax(boolean oToMove, int depth) {
		int[] line = winningLine();
		if (line != null) {
			return board[line[0]] == 'O' ? 10 - depth : depth - 10;
		}
		if (full()) {
			return 0;
		}
		int best = oToMove ? Integer.MIN_VALUE : Integer.MAX_VALUE;
		for (int i = 0; i < 9; i++) {
			if (board[i] == EMPTY) {
				board[i] = oToMove ? 'O' : 'X';
				int score = minimax(!oToMove, depth + 1);
				board[i] = EMPTY;
				best = oToMove ? Math.max(best, score) : Math.min(best, score);
			}
		}
		return best;
	}

	int[] winningLine() {
		for (int[] line : LINES) {
			char first = board[line[0]];
			if (first != EMPTY && first == board[line[1]] && first == board[line[2]]) {
				return line;
			}
		}
		return null;
	}

	boolean full() {
		for (char square : board) {
			if (square == EMPTY) {
				return false;
			}
		}
		return true;
	}

	boolean gameOver() {
		return winningLine() != null || full();
	}

	public static void main(String[] args) {
		SwingUtilities.invokeLater(Main::new);
	}
}