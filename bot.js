require("dotenv").config()
const oa = require("openai")
const fs = require("fs")
const responses = require("./responses.json")
const roleRequestQueue = []
const telegramCharacterLimit=process.env.TELEGRAM_CHARACTER_LIMIT
const language=process.env.LANGUAGE

if (!fs.existsSync("./roles")){
    fs.mkdirSync("./roles");
}

if (!fs.existsSync("./contexts")){
    fs.mkdirSync("./contexts");
}

const openai = new oa({
    organization: process.env.OPENAI_ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY
})

const TelegramBot = require("node-telegram-bot-api")
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {polling: true})

// Show Role
bot.onText(/^\/showrole/, (message, _) => {
    const roleFilepath = "./roles/" + message.chat.id
    fs.readFile(roleFilepath, "utf-8", (error, data) => {
        roleResponse = responses[language].showrole.success
        // No role set = default role
        if (error) roleResponse += process.env.OPENAI_DEFAULT_ROLE
        else roleResponse += data
        reply(message.chat.id, roleResponse)
    })
})

// Set Role
bot.onText(/^\/setrole/, (message, _) => {
    reply(message.chat.id, responses[language].setrole.describe)
    roleRequestQueue.push(message.chat.id)
})

// Reset Role
bot.onText(/^\/resetrole/, (message, _) => {
    const roleFilepath = "./roles/" + message.chat.id
    fs.unlink(roleFilepath, (error) => {
        if (error) console.log(error)
        reply(message.chat.id, responses[language].resetrole.success)
    })
})

// Receive Context File (.txt)
bot.on("document", (message, _) => {
    if (message.document.mime_type != "text/plain") {
        reply(message.chat.id, responses[language].setcontext.nottxt)
    } else {
        bot.downloadFile(message.document.file_id, "./contexts").then(
            (tmpFilepath) => {
                const contextFilepath = "./contexts/" + message.chat.id
                fs.renameSync(tmpFilepath, contextFilepath)
                reply(message.chat.id, responses[language].setcontext.success)
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
            reply(message.chat.id, responses[language].showcontext.fail)
        }
        else {
            var contextResponse = responses[language].showcontext.success + data
            reply(message.chat.id, contextResponse)
        }
    })
})

// Remove Context File (.txt)
bot.onText(/^\/clearcontext/, (message, _) => {
    const contextFilepath = "./contexts/" + message.chat.id
    fs.unlink(contextFilepath, (error) => {
        if (error) console.log(error)
        reply(message.chat.id, responses[language].clearcontext.success)
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
                reply(message.chat.id, responses[language].setrole.fail)
            } else {
                const response = responses[language].setrole.success + roleDescription
                reply(message.chat.id, response)
            }
            roleRequestQueue.splice(roleRequestQueue.indexOf(message.chat.id), 1)
        })
    } else {
        // Chat did not request /setrole
        fs.readFile(roleFilepath, "utf-8", (error, data) => {
            // Use retrieved response
            var role = process.env.OPENAI_DEFAULT_ROLE
            if (error) {
                console.log(error)
                fs.writeFile(roleFilepath, process.env.OPENAI_DEFAULT_ROLE, () => {})
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
                reply(message.chat.id, completion.choices[0].message.content)
            })
        })
    }
})

function reply(chatId, response) {
    if (response.length <= telegramCharacterLimit) bot.sendMessage(chatId, response)
    else {
        var delimiterIndex = response.slice(0, telegramCharacterLimit).lastIndexOf(" ")
        beginningResponse = response.slice(0, delimiterIndex)
        remainingResponse = response.slice(delimiterIndex + 1, response.length)
        bot.sendMessage(chatId, beginningResponse).then((_) => {
            reply(chatId, remainingResponse)
        })
    }
}