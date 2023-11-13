require("dotenv").config()
const oa = require("openai")
const fs = require("fs")
const responses = require("./responses.json")
const roleRequestQueue = []

if (!fs.existsSync("./roles")){
    fs.mkdirSync("./roles");
}

if (!fs.existsSync("./contexts")){
    fs.mkdirSync("./contexts");
}

// const config = new Configuration({
//     organization: process.env.OPENAI_ORGANIZATION,
//     apiKey: process.env.OPENAI_API_KEY
// })
const openai = new oa()

const TelegramBot = require("node-telegram-bot-api")
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {polling: true})

// Set Role
bot.onText(/^\/setrole/, (message, _) => {
    bot.sendMessage(message.chat.id, responses.en.setrole.describe)
    roleRequestQueue.push(message.chat.id)
})

// Reset Role
bot.onText(/^\/resetrole/, (message, _) => {
    const roleFilepath = "./roles/" + message.chat.id
    fs.unlink(roleFilepath, (error) => {
        if (error) console.log(error)
        bot.sendMessage(message.chat.id, responses.en.resetrole.success)
    })
})

// Receive Context File (.txt)
bot.on("document", (message, _) => {
    if (message.document.mime_type != "text/plain") {
        bot.sendMessage(message.chat.id, responses.en.setcontext.nottxt)
    } else {
        bot.downloadFile(message.document.file_id, "./contexts").then(
            (tmpFilepath) => {
                const contextFilepath = "./contexts/" + message.chat.id
                fs.renameSync(tmpFilepath, contextFilepath)
                bot.sendMessage(message.chat.id, responses.en.setcontext.success)
            },
            (reason) => { console.log(reason) }
        )
    }
})

// Show Context File (.txt)
bot.onText(/^\/showcontext/, (message, _) => {
    const contextFilepath = "./contexts/" + message.chat.id
    fs.readFile(contextFilepath, "utf-8", (error, data) => {
        if (error) {
            console.log(error)
            bot.sendMessage(message.chat.id, responses.en.showcontext.fail)
        }
        else {
            var contextResponse = responses.en.showcontext.success
            if (data.length <= 4000) contextResponse += "\n" + data
            else contextResponse += "\n" + data.substring(0, 1000) + "\n.\n.\n.\n" + data.substring(data.length - 1000, data.length)
            bot.sendMessage(message.chat.id, contextResponse)
        }
    })
})

// Remove Context File (.txt)
bot.onText(/^\/clearcontext/, (message, _) => {
    const contextFilepath = "./contexts/" + message.chat.id
    fs.unlink(contextFilepath, (error) => {
        if (error) console.log(error)
        bot.sendMessage(message.chat.id, responses.en.clearcontext.success)
    })
})

// Regular Messages
bot.onText(/^[^\/].*/, (message, _) => {
    const roleFilepath = "./roles/" + message.chat.id
    const contextFilepath = "./contexts/" + message.chat.id

    // Check if chat is requesting /setrole
    if (roleRequestQueue.indexOf(message.chat.id) != -1) {
        // Chat requested /setrole
        const roleDescription = message.text.replace(/^\"/, "").replace(/\"$/, "")
        fs.writeFile(roleFilepath, roleDescription, (error) => {
            if (error) {
                console.log(error)
                bot.sendMessage(message.chat.id, responses.en.setrole.fail)
            } else {
                const response = responses.en.setrole.success + roleDescription
                bot.sendMessage(message.chat.id, response)
            }
            roleRequestQueue.splice(roleRequestQueue.indexOf(message.chat.id), 1)
        })
    } else {
        // Chat did not request /setrole
        fs.readFile(roleFilepath, "utf-8", (error, data) => {
            // Use retrieved response
            var role = process.env.DEFAULT_ROLE
            if (error) {
                console.log(error)
                fs.writeFile(roleFilepath, process.env.DEFAULT_ROLE, () => {})
            }
            else role = data
            
            var messages = [
                {role: "system", content: role},
                {role: "user", content: message.text}
            ]
            // Retrieve context
            try {
                const context = fs.readFileSync(contextFilepath, "utf-8")
                messages.unshift({role: "system", content: context})
            } catch (contextError) {}

            openai.chat.completions.create({
                model: process.env.OPENAI_MODEL,
                messages
            }).then((completion) => {
                bot.sendMessage(message.chat.id, completion.choices[0].message.content)
            })
        })
    }
})