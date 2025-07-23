const RETRY_INTERVAL = 1000;

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => window.setTimeout(resolve, ms));
}

export function useRetry(retryCount?: number) {
	let shouldRetry = false;
	let maxRetries = retryCount ?? 3;
	let currRetry = 0;

	async function exec<T>(func: () => T): Promise<T> {
		while (currRetry < maxRetries) {
			try {
				const output = func();
				if (!shouldRetry) {
					return output;
				}
				shouldRetry = false;
				currRetry++;
				if (currRetry < maxRetries) {
					await sleep(RETRY_INTERVAL);
				}
			} catch (error) {
				currRetry++;
				if (currRetry >= maxRetries) {
					throw new Error(`Failed to exec function after ${maxRetries} retries: ${error.message}`);
				}
				await sleep(RETRY_INTERVAL);
			}
		}
		throw new Error(`Failed to exec function, hit max retries (${maxRetries})`);
	}

	function setShouldRetry() {
		shouldRetry = true;
	}

	return {
		exec,
		setShouldRetry,
	}
}
