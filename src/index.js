const path = require('path')
const fs = require('fs')
const AdmZip = require('adm-zip')
const moment = require('moment')
var sanitize = require('sanitize-filename')
const { ensureDirectoriesExist } = require('./utils')
const { entryToMarkdown } = require('./convert')

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
