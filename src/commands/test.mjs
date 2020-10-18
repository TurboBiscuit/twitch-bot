export default {
    name:'test',
    aliases:['pog'],
    run: async ({
        channel,
        command_name,
        args,
        data,
        message,
        twitch
    }) =>{
        twitch.say(channel,'pog')
    }
}