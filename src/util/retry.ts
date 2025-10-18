// Declare sleep as a global function available in Obsidian environment
declare function sleep(ms: number): Promise<void>;

const RETRY_INTERVAL = 1000;

export function useRetry(retryCount?: number) {
	let shouldRetry = false;
	let maxRetries = retryCount ?? 3;
	let currRetry = 0;

	async function exec<T>(func: () => T): Promise<T> {
		while (currRetry < maxRetries) {
			const output = func();
			if (!shouldRetry) {
				return output;
			}
			shouldRetry = false;
			currRetry++;
			// Use Obsidian's built-in sleep function
			await sleep(RETRY_INTERVAL);
		}
		throw new Error("Failed to exec function, hit max retries");
	}

	function setShouldRetry() {
		shouldRetry = true;
	}

	return {
		exec,
		setShouldRetry,
	}
}
