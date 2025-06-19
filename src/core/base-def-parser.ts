import { DefFileParseConfig, getSettings } from "src/settings";

export class BaseDefParser {
	parseSettings: DefFileParseConfig;

	constructor(parseSettings?: DefFileParseConfig) {
		this.parseSettings = parseSettings ? parseSettings : this.getParseSettings();
	}

    getParseSettings(): DefFileParseConfig {
		return getSettings().defFileParseConfig;
	}
}
