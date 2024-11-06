let express = require('express')

//cloud storage connect to

const {Storage} = require('@google-cloud/storage')

const storage = new Storage({
    keyFilename: 'key.json'
})

let multer = require('multer')

let app = express()

app.use(express.json())
app.use(express.urlencoded({extended: false}))

const upload = multer({
    storage: multer.memoryStorage()
})

const bucketName = 'trabajo-terminal'
const bucket = storage.bucket(bucketName)

app.set('view engine', 'ejs')


app.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file
    if(!file){
        res.status(400).send('Please upload a file')
        return
    }

    const fileName = Date.now() + '-' + file.originalname

    //convert to blob
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


app.get('/', (req, res) => {
    //read the files in the bucket

    try {
        const [files] = bucket.getFiles()

        res.render('index', {files})
    }catch (error) {
        res.status(500).send
    }
})

app.listen(4000, () => {
    console.log('App is running in 4000')
})