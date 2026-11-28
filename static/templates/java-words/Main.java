import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Main {
	public static void main(String[] args) throws IOException {
		// passage.txt opens A Tale of Two Cities (Charles Dickens, 1859). Paste in your own text
		// and run again.
		Map<String, Long> counts = Files.readAllLines(Paths.get("passage.txt")).stream()
			.flatMap(line -> Stream.of(line.toLowerCase().split("[^a-z']+")))
			.filter(word -> !word.isEmpty())
			.collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

		System.out.println(counts.size() + " different words. The ten most common:");
		counts.entrySet().stream()
			.sorted(Map.Entry.<String, Long>comparingByValue().reversed()
				.thenComparing(Map.Entry.comparingByKey()))
			.limit(10)
			.forEach(entry -> System.out.printf("%-8s %d%n", entry.getKey(), entry.getValue()));
	}
}