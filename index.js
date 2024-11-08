let express = require('express')

// Cloud storage connection
const { Storage } = require('@google-cloud/storage')

const storage = new Storage({
    keyFilename: 'key.json'
})

let multer = require('multer')

let app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const upload = multer({
    storage: multer.memoryStorage()
})

const bucketName = 'trabajo-terminal'
const bucket = storage.bucket(bucketName)

app.set('view engine', 'ejs')

app.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file
    if (!file) {
        res.status(400).send('Please upload a file')
        return
    }

    const fileName = Date.now() + '-' + file.originalname

    // Convert to blob
    const blob = bucket.file(fileName)
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.mimetype
        }
    })

    blobStream.on('error', (err) => {
        res.status(500).send(err)
    })

    blobStream.on('finish', () => {
        res.redirect('/')
    })

    blobStream.end(file.buffer)
})

app.get('/', async (req, res) => {
    try {
        // Read the files in the bucket
        const [files] = await bucket.getFiles()
        res.render('index', { files })
    } catch (error) {
        res.status(500).send('Error fetching files from the bucket: ' + error.message)
    }
})

//download
app.get('/download/:file', async (req, res) => {
    try {
        const file = bucket.file(req.params.file)
        const fileExists = await file.exists()

        if (!fileExists[0]) {
            res.status(404).send('File not found')
            return
        }

        const signedUrl = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 1000 * 60 * 5
        })

        res.redirect(signedUrl)

        const readStream = file.createReadStream()
        readStream.pipe(res)
    } catch (error) {
        res.status(500).send('Error downloading the file: ' + error.message)
    }
})

app.post('/delete', async (req, res) => {
    const filename = req.body.fileName
    if (!filename) {
        res.status(404).send('File not found')
        return
    }
    try {
        await bucket.file(filename).delete()
        res.redirect('/')
    } catch (error) {
        console.log(error)
    }
}) 

app.listen(4000, () => {
    console.log('App is running on port 4000')
})
