import {App, Editor, renderMatches, SuggestModal} from "obsidian";
import {UsedCharacterSearch} from "./characterSearch";
import {CharacterService} from "../service/characterService";
import {
    ELEMENT_FREQUENT,
    ELEMENT_RECENT,
    INSERT_CHAR_INSTRUCTION,
    INSTRUCTION_DISMISS,
    NAVIGATE_INSTRUCTION
} from "./visualElements";
import {toHexadecimal} from "../../libraries/helpers/toHexadecimal";
import {getRandomItem} from "../../libraries/helpers/getRandomItem";
import {fillNullCharacterMatchScores} from "../../libraries/comparison/fillNullCharacterMatchScores";
import {compareCharacterMatches} from "../../libraries/comparison/compareCharacterMatches";
import {ReadCache} from "../../libraries/types/readCache";
import {mostRecentUses} from "../../libraries/helpers/mostRecentUses";
import {averageUseCount} from "../../libraries/helpers/averageUseCount";
import {UsageDisplayStatistics} from "../../libraries/types/usageDisplayStatistics";
import {toNullMatch} from "../../libraries/helpers/toNullMatch";
import {toSearchQueryMatch} from "../../libraries/helpers/toSearchQueryMatch";
import {matchedNameOrCodepoint} from "../../libraries/helpers/matchedNameOrCodepoint";

import {ParsedUsageInfo} from "../../libraries/types/savedata/parsedUsageInfo";

export class FuzzySearchModal extends SuggestModal<UsedCharacterSearch> {
    private usageStatistics: ReadCache<UsageDisplayStatistics>;
    obsidianApp: App;

    public constructor(
        app: App,
        private readonly editor: Editor,
        private readonly characterService: CharacterService,
    ) {
        super(app);
        this.obsidianApp = app
        super.setInstructions([
            NAVIGATE_INSTRUCTION,
            INSERT_CHAR_INSTRUCTION,
            INSTRUCTION_DISMISS,
        ]);

        // Purposefully ignored result
        this.setRandomPlaceholder().then();

        this.usageStatistics = new ReadCache(async () => {
            const usedCharacters = await characterService.getUsed();
            return {
                topThirdRecentlyUsed: mostRecentUses(usedCharacters).slice(0, 3).last() ?? new Date(0),
                averageUseCount: averageUseCount(usedCharacters),
            } as UsageDisplayStatistics;
        })
    }

    public override async getSuggestions(query: string): Promise<UsedCharacterSearch[]> {
        const allCharacters = await this.characterService.getAll();
        const queryEmpty = query == null || query.length < 1;

        const prepared = queryEmpty
            ? allCharacters
                .map(toNullMatch)
            : allCharacters
                .map(toSearchQueryMatch(query))
                .filter(matchedNameOrCodepoint);

        const recencyCutoff = (await this.usageStatistics.getValue()).topThirdRecentlyUsed;
        return prepared
            .sort((l, r) => compareCharacterMatches(l, r, recencyCutoff))
            .map(fillNullCharacterMatchScores);
    }

    public override async renderSuggestion(search: UsedCharacterSearch, container: HTMLElement): Promise<void> {
        const char = search.item;

        container.addClass("plugin", "unicode-search", "result-item");

        container.createDiv({
            cls: "character-preview",
        }).createSpan({
            text: char.codepoint,
        });

        const matches = container.createDiv({
            cls: "character-match",
        });

        const text = matches.createDiv({
            cls: "character-name",
        });

        renderMatches(text, char.name, search.match.name.matches);

        if (search.match.codepoint.matches.length > 0) {
            const codepoint = matches.createDiv({
                cls: "character-codepoint",
            });

            renderMatches(codepoint, toHexadecimal(char), search.match.codepoint.matches);
        }

        const detail = container.createDiv({
            cls: "detail",
        });

        const usageStats = await this.usageStatistics.getValue();

        /* The type hinting doesn't work, and shows as an error in the IDE (or the type is wrong) */
        const maybeUsedChar = char as Partial<ParsedUsageInfo>
		const showLastUsed = maybeUsedChar.lastUsed != null && maybeUsedChar.lastUsed >= usageStats.topThirdRecentlyUsed;
		const showUseCount = maybeUsedChar.useCount != null && maybeUsedChar.useCount >= usageStats.averageUseCount;

		const attributes = detail.createDiv({
			cls: "attributes",
		});

		if (showLastUsed) {
			attributes.createDiv(ELEMENT_RECENT);
		}

		if (showUseCount) {
			attributes.createDiv(ELEMENT_FREQUENT);
		}
    }

    public override async onChooseSuggestion(search: UsedCharacterSearch, evt: MouseEvent | KeyboardEvent): Promise<void> {
        if (this?.editor)
            this.editor.replaceSelection(search.item.codepoint);
        else{
            // @ts-ignore
            let view = this.obsidianApp.workspace.getActiveFileView()
            if (view?.excalidrawData) {
                let ea = (window as any).ExcalidrawAutomate;
                let editable = ea.targetView.contentEl.querySelector(".excalidraw-textEditorContainer").firstChild
                if (editable) {
                    editable.value += search.item.codepoint
                } else {
                    ea.clear()
                    let id = ea.addText(0, 0, search.item.codepoint)
                    await ea.addElementsToView(true, false, false);
                    ea.clear()
                }
            }
        }
        try {
            await this.characterService.recordUsage(search.item.codepoint);
        } catch (error) {
            console.error("Failed to record character usage", {err: error});
        }
    }

    public override async onNoSuggestion(): Promise<void> {
        await this.setRandomPlaceholder();
    }

    private async setRandomPlaceholder(): Promise<void> {
        const randomCharacterName = getRandomItem(await this.characterService.getAllCharacters()).name;
        super.setPlaceholder(`Unicode search: ${randomCharacterName}`);
    }

}
