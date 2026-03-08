const { entryToMarkdown, getFrontMatter, buildFileName } = require('./convert')

const PHOTOS_DIR = '99-assets/dayone'

function makeEntry(overrides = {}) {
    return {
        uuid: 'abc123',
        creationDate: '2023-06-15T10:00:00Z',
        text: 'Hello world\nThis is the body.',
        starred: false,
        tags: [],
        ...overrides,
    }
}

// ---------------------------------------------------------------------------
// entryToMarkdown
// ---------------------------------------------------------------------------

describe('entryToMarkdown', () => {
    describe('title / body splitting', () => {
        test('first line becomes title, rest becomes body', () => {
            const entry = makeEntry({ text: 'My Title\nBody text here.' })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.title).toBe('My Title')
            expect(result.md).toContain('Body text here.')
        })

        test('single-line entry: full text is title, body is empty', () => {
            const entry = makeEntry({ text: 'Just a single line' })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.title).toBe('Just a single line')
            expect(result.md).not.toMatch(/Just a single line[\s\S]*Just a single line/)
        })

        test('missing text field does not crash', () => {
            const entry = makeEntry({ text: undefined })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.title).toBe('')
        })

        test('strips leading # heading syntax from title when entry starts with image', () => {
            const entry = makeEntry({
                text: '![](dayone-moment://PHOTOID)\n# My Heading\nBody text.',
                photos: [{ identifier: 'PHOTOID', md5: 'abc', type: 'jpeg' }],
            })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.title).toBe('My Heading')
        })
    })

    describe('entries starting with an image tag', () => {
        test('image-first entry: image goes to body, next text line is title', () => {
            const entry = makeEntry({
                text: '![](dayone-moment://PHOTOID)\nReal Title\nBody.',
                photos: [{ identifier: 'PHOTOID', md5: 'deadbeef', type: 'jpeg' }],
            })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.title).toBe('Real Title')
            expect(result.md).toContain('99-assets/dayone/deadbeef.jpeg')
        })

        test('all-image entry with no text line: title is empty string', () => {
            const entry = makeEntry({
                text: '![](dayone-moment://PHOTOID)',
                photos: [{ identifier: 'PHOTOID', md5: 'deadbeef', type: 'jpeg' }],
            })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.title).toBe('')
        })
    })

    describe('photo substitution', () => {
        test('replaces dayone-moment:// with photosDir path', () => {
            const entry = makeEntry({
                text: 'Look at this\n![](dayone-moment://PHOTOID)',
                photos: [{ identifier: 'PHOTOID', md5: 'abc123', type: 'png' }],
            })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.md).toContain('99-assets/dayone/abc123.png')
            expect(result.md).not.toContain('dayone-moment://')
        })

        test('respects custom photosDir', () => {
            const entry = makeEntry({
                text: 'Photo\n![](dayone-moment://PHOTOID)',
                photos: [{ identifier: 'PHOTOID', md5: 'abc123', type: 'jpg' }],
            })
            const result = entryToMarkdown(entry, 'public/images')
            expect(result.md).toContain('public/images/abc123.jpg')
        })

        test('substitutes multiple photos', () => {
            const entry = makeEntry({
                text: 'Title\n![](dayone-moment://ID1)\n![](dayone-moment://ID2)',
                photos: [
                    { identifier: 'ID1', md5: 'hash1', type: 'jpeg' },
                    { identifier: 'ID2', md5: 'hash2', type: 'jpeg' },
                ],
            })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.md).toContain('hash1.jpeg')
            expect(result.md).toContain('hash2.jpeg')
        })
    })

    describe('video substitution', () => {
        test('replaces video link with text placeholder', () => {
            const entry = makeEntry({
                text: 'Title\n![](dayone-moment:/video/VIDEOID)',
                videos: [{ identifier: 'VIDEOID', type: 'mp4' }],
            })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.md).toContain('*(video: VIDEOID.mp4)*')
            expect(result.md).not.toContain('dayone-moment:/video/')
        })

        test('defaults to mp4 when video type is missing', () => {
            const entry = makeEntry({
                text: 'Title\n![](dayone-moment:/video/VIDEOID)',
                videos: [{ identifier: 'VIDEOID' }],
            })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.md).toContain('*(video: VIDEOID.mp4)*')
        })
    })

    describe('audio substitution', () => {
        test('replaces audio link with *(audio)*', () => {
            const entry = makeEntry({
                text: 'Title\n![](dayone-moment:/audio/AUDIOID)',
            })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.md).toContain('*(audio)*')
            expect(result.md).not.toContain('dayone-moment:/audio/')
        })
    })

    describe('metadata', () => {
        test('includes uuid, date, location, starred, tags', () => {
            const entry = makeEntry({
                uuid: 'entry-uuid',
                creationDate: '2023-06-15T10:00:00Z',
                starred: true,
                tags: ['travel', 'journal'],
                location: { placeName: 'Paris' },
            })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.id).toBe('entry-uuid')
            expect(result.starred).toBe(true)
            expect(result.location).toBe('Paris')
            expect(result.tags).toEqual(['travel', 'journal'])
        })

        test('location is empty string when not present', () => {
            const entry = makeEntry({ location: undefined })
            const result = entryToMarkdown(entry, PHOTOS_DIR)
            expect(result.location).toBe('')
        })
    })
})

// ---------------------------------------------------------------------------
// getFrontMatter
// ---------------------------------------------------------------------------

describe('getFrontMatter', () => {
    test('wraps output in --- delimiters', () => {
        const result = getFrontMatter({ title: 'Hello' })
        expect(result.startsWith('---\n')).toBe(true)
        expect(result.endsWith('---')).toBe(true)
    })

    test('includes all entry fields', () => {
        const result = getFrontMatter({ title: 'My Title', starred: false })
        expect(result).toContain('title:')
        expect(result).toContain('starred:')
    })

    test('joins array values with comma', () => {
        const result = getFrontMatter({ tags: ['one', 'two', 'three'] })
        expect(result).toContain('"one, two, three"')
    })

    test('handles empty array as empty string', () => {
        const result = getFrontMatter({ tags: [] })
        expect(result).toContain('tags: ""')
    })
})

// ---------------------------------------------------------------------------
// buildFileName
// ---------------------------------------------------------------------------

describe('buildFileName', () => {
    test('formats date as YYYY-MM-DD', () => {
        const name = buildFileName('15 Jun, 2023', 'My Entry')
        expect(name).toMatch(/^2023-06-15 - /)
    })

    test('appends .md extension', () => {
        const name = buildFileName('15 Jun, 2023', 'My Entry')
        expect(name.endsWith('.md')).toBe(true)
    })

    test('falls back to "untitled" when title is empty', () => {
        const name = buildFileName('15 Jun, 2023', '')
        expect(name).toBe('2023-06-15 - untitled.md')
    })

    test('truncates title to 100 characters', () => {
        const longTitle = 'A'.repeat(200)
        const name = buildFileName('15 Jun, 2023', longTitle)
        const titlePart = name.replace('2023-06-15 - ', '').replace('.md', '')
        expect(titlePart.length).toBe(100)
    })

    test('sanitizes characters invalid in filenames', () => {
        const name = buildFileName('15 Jun, 2023', 'Title with / slashes')
        expect(name).not.toContain('/')
    })
})
