import { DefFileParseConfig } from "src/settings";

export class BaseDefParser {
	parseSettings?: DefFileParseConfig;

	constructor(parseSettings?: DefFileParseConfig) {
		this.parseSettings = parseSettings;
	}

    getParseSettings(): DefFileParseConfig | undefined {
		return this.parseSettings;
	}
}
