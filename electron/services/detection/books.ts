/**
 * The 66-book table with canonical names, abbreviations and aliases.
 * Ported from crates/detection/src/direct/books.rs.
 */
export interface BookInfo {
  number: number
  name: string
  abbreviation: string
  aliases: string[]
}

export const BOOKS: BookInfo[] = [
  { number: 1, name: "Genesis", abbreviation: "Gen", aliases: ["Gen", "Ge", "Gn"] },
  { number: 2, name: "Exodus", abbreviation: "Exod", aliases: ["Exod", "Exo", "Ex"] },
  { number: 3, name: "Leviticus", abbreviation: "Lev", aliases: ["Lev", "Le", "Lv"] },
  { number: 4, name: "Numbers", abbreviation: "Num", aliases: ["Num", "Nu", "Nm", "Nb"] },
  { number: 5, name: "Deuteronomy", abbreviation: "Deut", aliases: ["Deut", "De", "Dt"] },
  { number: 6, name: "Joshua", abbreviation: "Josh", aliases: ["Josh", "Jos", "Jsh"] },
  { number: 7, name: "Judges", abbreviation: "Judg", aliases: ["Judg", "Jdg", "Jg", "Jdgs"] },
  { number: 8, name: "Ruth", abbreviation: "Ruth", aliases: ["Ruth", "Rth", "Ru"] },
  { number: 9, name: "1 Samuel", abbreviation: "1 Sam", aliases: ["1 Sam", "1 Sa", "1Sam", "1Sa", "First Samuel", "1st Samuel", "I Samuel"] },
  { number: 10, name: "2 Samuel", abbreviation: "2 Sam", aliases: ["2 Sam", "2 Sa", "2Sam", "2Sa", "Second Samuel", "2nd Samuel", "II Samuel"] },
  { number: 11, name: "1 Kings", abbreviation: "1 Kgs", aliases: ["1 Kgs", "1 Ki", "1Kgs", "1Ki", "First Kings", "1st Kings", "I Kings"] },
  { number: 12, name: "2 Kings", abbreviation: "2 Kgs", aliases: ["2 Kgs", "2 Ki", "2Kgs", "2Ki", "Second Kings", "2nd Kings", "II Kings"] },
  { number: 13, name: "1 Chronicles", abbreviation: "1 Chr", aliases: ["1 Chr", "1 Ch", "1Chr", "1Ch", "First Chronicles", "1st Chronicles", "I Chronicles"] },
  { number: 14, name: "2 Chronicles", abbreviation: "2 Chr", aliases: ["2 Chr", "2 Ch", "2Chr", "2Ch", "Second Chronicles", "2nd Chronicles", "II Chronicles"] },
  { number: 15, name: "Ezra", abbreviation: "Ezra", aliases: ["Ezra", "Ezr"] },
  { number: 16, name: "Nehemiah", abbreviation: "Neh", aliases: ["Neh", "Ne"] },
  { number: 17, name: "Esther", abbreviation: "Esth", aliases: ["Esth", "Est", "Es"] },
  { number: 18, name: "Job", abbreviation: "Job", aliases: ["Job", "Jb"] },
  { number: 19, name: "Psalms", abbreviation: "Ps", aliases: ["Psalm", "Psalms", "Ps", "Psa", "Psm", "Pss"] },
  { number: 20, name: "Proverbs", abbreviation: "Prov", aliases: ["Prov", "Pro", "Prv", "Pr"] },
  { number: 21, name: "Ecclesiastes", abbreviation: "Eccl", aliases: ["Eccl", "Ecc", "Ec", "Qoh"] },
  { number: 22, name: "Song of Solomon", abbreviation: "Song", aliases: ["Song", "Song of Solomon", "Song of Songs", "SOS", "So", "Cant"] },
  { number: 23, name: "Isaiah", abbreviation: "Isa", aliases: ["Isa", "Is"] },
  { number: 24, name: "Jeremiah", abbreviation: "Jer", aliases: ["Jer", "Je", "Jr"] },
  { number: 25, name: "Lamentations", abbreviation: "Lam", aliases: ["Lam", "La"] },
  { number: 26, name: "Ezekiel", abbreviation: "Ezek", aliases: ["Ezek", "Eze", "Ezk"] },
  { number: 27, name: "Daniel", abbreviation: "Dan", aliases: ["Dan", "Da", "Dn"] },
  { number: 28, name: "Hosea", abbreviation: "Hos", aliases: ["Hos", "Ho"] },
  { number: 29, name: "Joel", abbreviation: "Joel", aliases: ["Joel", "Jl"] },
  { number: 30, name: "Amos", abbreviation: "Amos", aliases: ["Amos", "Am"] },
  { number: 31, name: "Obadiah", abbreviation: "Obad", aliases: ["Obad", "Ob"] },
  { number: 32, name: "Jonah", abbreviation: "Jonah", aliases: ["Jonah", "Jnh", "Jon"] },
  { number: 33, name: "Micah", abbreviation: "Mic", aliases: ["Mic", "Mc"] },
  { number: 34, name: "Nahum", abbreviation: "Nah", aliases: ["Nah", "Na"] },
  { number: 35, name: "Habakkuk", abbreviation: "Hab", aliases: ["Hab", "Hb"] },
  { number: 36, name: "Zephaniah", abbreviation: "Zeph", aliases: ["Zeph", "Zep", "Zp"] },
  { number: 37, name: "Haggai", abbreviation: "Hag", aliases: ["Hag", "Hg"] },
  { number: 38, name: "Zechariah", abbreviation: "Zech", aliases: ["Zech", "Zec", "Zc"] },
  { number: 39, name: "Malachi", abbreviation: "Mal", aliases: ["Mal", "Ml"] },
  { number: 40, name: "Matthew", abbreviation: "Matt", aliases: ["Matt", "Mat", "Mt"] },
  { number: 41, name: "Mark", abbreviation: "Mark", aliases: ["Mark", "Mrk", "Mk", "Mr"] },
  { number: 42, name: "Luke", abbreviation: "Luke", aliases: ["Luke", "Luk", "Lk"] },
  { number: 43, name: "John", abbreviation: "John", aliases: ["John", "Joh", "Jhn", "Jn"] },
  { number: 44, name: "Acts", abbreviation: "Acts", aliases: ["Acts", "Act", "Ac"] },
  { number: 45, name: "Romans", abbreviation: "Rom", aliases: ["Rom", "Ro", "Rm"] },
  { number: 46, name: "1 Corinthians", abbreviation: "1 Cor", aliases: ["1 Cor", "1 Co", "1Cor", "1Co", "First Corinthians", "1st Corinthians", "I Corinthians"] },
  { number: 47, name: "2 Corinthians", abbreviation: "2 Cor", aliases: ["2 Cor", "2 Co", "2Cor", "2Co", "Second Corinthians", "2nd Corinthians", "II Corinthians"] },
  { number: 48, name: "Galatians", abbreviation: "Gal", aliases: ["Gal", "Ga"] },
  { number: 49, name: "Ephesians", abbreviation: "Eph", aliases: ["Eph", "Ephes"] },
  { number: 50, name: "Philippians", abbreviation: "Phil", aliases: ["Phil", "Php", "Pp"] },
  { number: 51, name: "Colossians", abbreviation: "Col", aliases: ["Col", "Co"] },
  { number: 52, name: "1 Thessalonians", abbreviation: "1 Thess", aliases: ["1 Thess", "1 Th", "1Thess", "1Th", "First Thessalonians", "1st Thessalonians", "I Thessalonians"] },
  { number: 53, name: "2 Thessalonians", abbreviation: "2 Thess", aliases: ["2 Thess", "2 Th", "2Thess", "2Th", "Second Thessalonians", "2nd Thessalonians", "II Thessalonians"] },
  { number: 54, name: "1 Timothy", abbreviation: "1 Tim", aliases: ["1 Tim", "1 Ti", "1Tim", "1Ti", "First Timothy", "1st Timothy", "I Timothy"] },
  { number: 55, name: "2 Timothy", abbreviation: "2 Tim", aliases: ["2 Tim", "2 Ti", "2Tim", "2Ti", "Second Timothy", "2nd Timothy", "II Timothy"] },
  { number: 56, name: "Titus", abbreviation: "Titus", aliases: ["Titus", "Tit", "Ti"] },
  { number: 57, name: "Philemon", abbreviation: "Phlm", aliases: ["Phlm", "Phm", "Philem"] },
  { number: 58, name: "Hebrews", abbreviation: "Heb", aliases: ["Heb"] },
  { number: 59, name: "James", abbreviation: "Jas", aliases: ["Jas", "Jm"] },
  { number: 60, name: "1 Peter", abbreviation: "1 Pet", aliases: ["1 Pet", "1 Pe", "1Pet", "1Pe", "First Peter", "1st Peter", "I Peter"] },
  { number: 61, name: "2 Peter", abbreviation: "2 Pet", aliases: ["2 Pet", "2 Pe", "2Pet", "2Pe", "Second Peter", "2nd Peter", "II Peter"] },
  { number: 62, name: "1 John", abbreviation: "1 John", aliases: ["1 John", "1 Jn", "1John", "1Jn", "First John", "1st John", "I John"] },
  { number: 63, name: "2 John", abbreviation: "2 John", aliases: ["2 John", "2 Jn", "2John", "2Jn", "Second John", "2nd John", "II John"] },
  { number: 64, name: "3 John", abbreviation: "3 John", aliases: ["3 John", "3 Jn", "3John", "3Jn", "Third John", "3rd John", "III John"] },
  { number: 65, name: "Jude", abbreviation: "Jude", aliases: ["Jude", "Jud", "Jd"] },
  { number: 66, name: "Revelation", abbreviation: "Rev", aliases: ["Rev", "Re", "Rv", "Apocalypse"] },
]

const BY_NUMBER = new Map<number, BookInfo>(BOOKS.map((b) => [b.number, b]))

export function bookByNumber(number: number): BookInfo | undefined {
  return BY_NUMBER.get(number)
}

/** Canonical display name ("Psalms" keeps its plural form). */
export function displayName(bookNumber: number): string {
  return BY_NUMBER.get(bookNumber)?.name ?? ""
}

/** All match patterns for one book, lowercased. */
export function allPatterns(book: BookInfo): string[] {
  return [...new Set([book.name.toLowerCase(), ...book.aliases.map((a) => a.toLowerCase())])]
}
