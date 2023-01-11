import axios, {AxiosInstance, AxiosResponse, HttpStatusCode} from "axios";
import {SearchResponseDto} from "./search-response.dto";
import {UnicodeCharacterInfoModel} from "./unicode-character-info.model";

export class UnicodeCharacterService {
	private readonly http: AxiosInstance;

	public constructor() {
		this.http = axios.create({
			baseURL: "https://unicode-table.com/en/",
			timeout: 1000,
			headers: {
				"content-type": "application/x-www-form-urlencoded; charset=UTF-8",
				"accept-language": "en-US,en;q=0.9,sk;q=0.8",
			},
			responseType: "json",
			validateStatus: status => status == HttpStatusCode.Ok,
		});
	}

	public async search(query: string): Promise<UnicodeCharacterInfoModel[]> {
		const formData = new URLSearchParams({
			s: query,
		});

		const request = this.http.post<
			SearchResponseDto,
			AxiosResponse<SearchResponseDto, string>,
			string
		>(
			"/a-search",
			formData.toString(),
		);

		let characters: Array<Array<string | null>>;

		try {
			const response = (await request).data;

			if (response?.result?.c == null) {
				return [];
			}

			characters = response.result.c;
		} catch (e) {
			return [];
		}

		return characters
			.filter(([code, description]) => code != null && description != null)
			.map(([code, description]) => ({
				code: code,
				description: description,
			} as UnicodeCharacterInfoModel));
	}

}