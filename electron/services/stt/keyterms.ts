/**
 * Deepgram keyword boosting, ported from crates/stt/src/keyterms.rs.
 */
const BOOK_NAMES = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges",
  "Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles",
  "2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs",
  "Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations",
  "Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah",
  "Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew",
  "Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians",
  "Galatians","Ephesians","Philippians","Colossians","1 Thessalonians",
  "2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews",
  "James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation",
]

const REFERENCE_TERMS = [
  "chapter","verse","verses","scripture","scriptures","passage","text",
  "reading","book","open to","turn to","reading from","next verse",
  "first","second","third",
  "chapter one","chapter two","chapter three","verse one","verse two",
  "verse three",
  "the Bible says","the scripture says","thus says the Lord","let us read",
  "our text","the word of God",
  "psalm","psalms","gospel","epistle","prophecy",
  "one","two","three","four","five","six","seven","eight","nine","ten",
  "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen",
  "eighteen","nineteen","twenty","thirty","forty","fifty","sixty","seventy",
  "eighty","ninety","hundred",
]

const SPOKEN_FORMS = [
  "First Samuel","Second Samuel","First Kings","Second Kings",
  "First Chronicles","Second Chronicles","First Corinthians",
  "Second Corinthians","First Thessalonians","Second Thessalonians",
  "First Timothy","Second Timothy","First Peter","Second Peter",
  "First John","Second John","Third John","Song of Songs",
]

export const CORE_KEYTERMS = ["Jesus", "Christ", "God", "Lord", "Holy Spirit"]

export function bibleKeyterms(): string[] {
  return [...BOOK_NAMES, ...REFERENCE_TERMS, ...SPOKEN_FORMS]
}
