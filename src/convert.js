const formatDate = require('date-fns').format
const moment = require('moment')
var sanitize = require('sanitize-filename')

function entryToMarkdown(entry, photosDir) {
    let fullText = entry.text || ''

    // Replace photo links before splitting title/body so image-only first lines are handled
    if (entry.photos) {
        entry.photos.forEach(photo => {
            fullText = fullText.split(`dayone-moment://${photo.identifier}`).join(`${photosDir}/${photo.md5}.${photo.type}`)
        })
    }

    // Replace video links with a plain label (videos can't embed in markdown)
    if (entry.videos) {
        entry.videos.forEach(video => {
            const pattern = new RegExp(`!\\[\\]\\(dayone-moment:/video/${video.identifier}\\)`, 'g')
            fullText = fullText.replace(pattern, `*(video: ${video.identifier}.${video.type || 'mp4'})*`)
        })
    }

    // Strip any remaining dayone-moment:/audio/ links
    fullText = fullText.replace(/!\[\]\(dayone-moment:\/audio\/[^)]+\)/g, '*(audio)*')

    const newlineIndex = fullText.indexOf('\n')
    let title = newlineIndex === -1 ? fullText.trim() : fullText.slice(0, newlineIndex).trim()
    let text = newlineIndex === -1 ? '' : fullText.slice(newlineIndex).trim()

    // If the first line is a markdown image/media tag, use it in the body and pick a title from the next line
    if (title.startsWith('![')) {
        const bodyLines = fullText.trim().split('\n')
        const firstTextLine = bodyLines.find(l => l.trim() && !l.trim().startsWith('!['))
        title = firstTextLine ? firstTextLine.replace(/^#+\s*/, '').trim() : ''
        text = fullText.trim()
    }

    let formattedEntry = {
        id: entry.uuid,
        date: formatDate(new Date(entry.creationDate), 'D MMM, YYYY'),
        title,
        location: entry.location ? entry.location.placeName : '',
        starred: entry.starred,
        tags: entry.tags
    }

    formattedEntry.md = [getFrontMatter(formattedEntry), text].join('\n\n')

    return formattedEntry
}

function getFrontMatter(entry) {
    var frontMatter = '---\n'
    for (var prop in entry) {
        if (entry.hasOwnProperty(prop)) {
            let item = entry[prop] || ''
            if (Array.isArray(item)) {
                item = item.join(', ')
            }
            frontMatter = `${frontMatter}${prop}: ${JSON.stringify(item)}\n`
        }
    }
    return frontMatter + '---'
}

function buildFileName(date, title) {
    const fileDate = moment(date, 'D MMM, YYYY').format('YYYY-MM-DD')
    const fileName = (sanitize(title) || 'untitled').slice(0, 100)
    return `${fileDate} - ${fileName}.md`
}

module.exports = { entryToMarkdown, getFrontMatter, buildFileName }
