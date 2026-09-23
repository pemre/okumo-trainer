import connectievenJson from "../data/connectieven.json";
import werkwoordenJson from "../data/werkwoorden.json";
import woordenJson from "../data/woorden.json";
import type { Connective, Verb, WordItem } from "./types";

export const words = woordenJson.items as WordItem[];
export const connectives = connectievenJson.items as Connective[];
export const verbs = werkwoordenJson.items as Verb[];
export const meta = woordenJson.meta;
