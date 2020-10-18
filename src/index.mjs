// Imports
import tmi from 'tmi.js'
import _fs from 'fs'
import path from 'path'
const fs = _fs.promises;

// .env checks (so the bot doesnt break!)
import dotenv from 'dotenv'
dotenv.config();
if (!process.env.TWITCH_USERNAME) throw Error('Missing "TWITCH_USERNAME" in .env');
if (!process.env.TWITCH_OAUTH) throw Error('Missing "TWITCH_OAUTH" in .env');
if (!process.env.TWITCH_CLIENTID) throw Error('Missing "TWITCH_CLIENTID" in .env');
if (!(process.env.TWITCH_USERNAME && process.env.TWITCH_OAUTH && process.env.TWITCH_CLIENTID)) process.exit(0);

// Initalize twitch client with tmi.js
const channels = new Map()
const commands = new Map()
/**
 * @type {tmi.Client}
 * VS Code wouldnt reconize this for some odd reason.
 */
const twitch = new tmi.Client({
    connection: {
        secure: true,
        reconnect: true,
    },
    identity: {
        username: process.env.TWITCH_USERNAME,
        password: process.env.TWITCH_OAUTH
    },
    channels: process.env.BOT_CHANNELS ? process.env.BOT_CHANNELS.split(',') : []
});
twitch.connect();

twitch.on('connected', (addr, port) => {
    console.log(`[TMI.JS] Connected ${addr}:${port}`)
});

twitch.on('disconnected', (reason) => {
    console.log(`[TMI.JS] Disconnected "${reason}"`)
})

twitch.on('logon', () => {
    console.log(`[TMI.JS] Logged In as ${twitch.getUsername()}`)
    setTimeout(() => { twitch.join(twitch.getUsername()) }, 3000)
});

twitch.on('join', (channel) => {
    if (channels.has(channel)) return;
    channels.set(channel)
    console.log(`[TMI.JS] Joined ${channel.slice(1)}`)
});

twitch.on('part', (channel) => {
    if (!channels.has(channel)) return;
    channels.delete(channel)
    console.log(`[TMI.JS] Left ${channel.slice(1)}`)
});

// Command Loader
var command_files = await fs.readdir(path.resolve('./src/commands'))
await Promise.all(command_files.map(async command => {
    var command_filename = `${command}`
    try {
        command = await import(path.resolve(`./src/commands/${command_filename}`))
        if (command.default) command = command.default
        if (!command.name) {
            console.log(`Command File "${command_filename}" has no name, using filename`)
            command.name = command_filenam.split('.')[0]
        }
        if (!command.run) return console.log(`Command File "${command_filename}" has no run function!`)
        commands.set(command.name, command)
    } catch (error) {
        console.log(`[TMI.JS] Error Loading Command "${command_filename}".\n${error.stack}`)
    }
}))

// Command Handler
twitch.on('message', async (channel, data, message, self) => {
    if (self) return;
    if (!channels.has(channel)) return twitch.part(channel.slice(1))
    var channel = channel.slice(1)
    const prefix = process.env.BOT_PREFIX || '!'
    const split = message.slice(prefix.length).split(' ')
    const command_name = split[0].toLowerCase()
    const args = split.slice(1, split.length - 1)
    const command = commands.get(command_name) || [...commands].map(e => e[1]).find(e => (e.aliases ? e.aliases : []).indexOf(command_name) != -1)
    if (!command) return
    if (command.users) {
        if (!command.users.includes(data["user-id"])) return twitch.say(channel, 'You are not authorized to use this command!')
    }
    if (command.mod && !data.mod) return twitch.say(channel, 'You are not authorized to use this command!')
    if (command.streamer && !data.badges.broadcaster) return twitch.say(channel, 'You are not authorized to use this command!')
    if (command.sub && !data.badges.subscriber) return twitch.say(channel, 'You must be subscribed to use this command!')
    if (command.args && (command.args.length != args.length)) return twitch.say(channel, `This command requires ${command.args.length} argument${command.args.length == 1 ? '' : 's'}`)
    try {
        await command.run({
            channel,
            command_name,
            args,
            data,
            message,
            twitch
        })
    } catch (error) {
        twitch.say(channel, `There was an error running that command please report this to the developer.`)
        console.log(`============== New Error ==============\nCommand: ${command_name}\n${args.length > 0 ? `Args: ${args.join(', ')}` : ''}\nChannel: ${channel}\nUser: ${data.username}\n=======================================`)
    }
})