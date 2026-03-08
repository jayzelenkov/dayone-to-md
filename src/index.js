const path = require('path')
const fs = require('fs')
const AdmZip = require('adm-zip')
const formatDate = require('date-fns').format
const moment = require('moment')
var sanitize = require('sanitize-filename')
const { ensureDirectoriesExist } = require('./utils')

const argv = process.argv.slice(2)
const photosDirFlagIdx = argv.indexOf('--photos-dir')
const photosDirArg = photosDirFlagIdx !== -1 && argv[photosDirFlagIdx + 1]
    ? argv[photosDirFlagIdx + 1]
    : '99-assets/dayone'

getDayoneFolderPath()
    .then(getDayoneZips)
    .then(zipDirs => unpackDayone(zipDirs, photosDirArg))
    .catch(err => {
        throw new Error(err)
    })

function getDayoneFolderPath() {
    return new Promise((res, reject) => {
        const dayonePath = path.resolve('dayone')

        fs.stat(dayonePath, (err, stat) => {
            if (err || !stat.isDirectory()) {
                return reject('No `dayone` folder found.`')
            }
            return res(dayonePath)
        })
    })
}

function getDayoneZips(dayonePath) {
    return new Promise((res, reject) => {
        fs.readdir(dayonePath, (err, files) => {
            if (err) {
                return reject(err)
            }
            const zipFiles = files.reduce((prev, current) => {
                if (current.indexOf('.zip') === current.length - 4) {
                    prev.push(path.join(dayonePath, current))
                }
                return prev
            }, [])
            if (!zipFiles.length) {
                return reject('No zip files found in `dayone` folder.')
            }

            res(zipFiles)
        })
    })
}

function unpackDayone(zipDirectories, photosDir) {
    let entriesProcess = 0

    zipDirectories.map(unpack)

    function unpack(directory) {
        // Make sure the output directories exist
        const entriesDirectory = path.resolve('./src/entries')
        const photosDirectory = path.resolve(photosDir)
        ensureDirectoriesExist([photosDirectory, entriesDirectory])

        var zip = new AdmZip(directory)
        var zipEntries = zip.getEntries() // an array of ZipEntry records

        zipEntries.forEach(function(zipEntry) {
            // Main json file — matches Journal.json or any root-level named journal (e.g. "My Journal.json")
            const isRootJson =
                zipEntry.entryName.endsWith('.json') &&
                !zipEntry.entryName.includes('/')
            if (isRootJson) {
                const fullData = JSON.parse(zip.readAsText(zipEntry.entryName))
                const mdEntries = fullData.entries.map(e => entryToMarkdown(e, photosDir))

                entriesProcess += mdEntries.length

                saveEntries(mdEntries, entriesDirectory)
            }
            // Photos
            if (zipEntry.entryName.indexOf('photos/') === 0) {
                zip.extractEntryTo(
                    /*entry name*/ zipEntry.entryName,
                    /*target path*/ photosDirectory,
                    /*maintainEntryPath*/ false,
                    /*overwrite*/ true
                )
            }
        })
    }

    console.log(`${entriesProcess} entries processed!`)
}

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

function saveEntries(entries, location) {
    entries.map(({ md, date, title }) => {
        const fileDate = moment(date, 'D MMM, YYYY').format('YYYY-MM-DD')
        const fileName = (sanitize(title) || 'untitled').slice(0, 100)
        var saveTo = path.join(location, `${fileDate} - ${fileName}.md`)
        fs.writeFileSync(saveTo, md, {
            encoding: 'utf8'
        })
    })
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
