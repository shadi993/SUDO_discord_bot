export interface RoleChannel {
    channel_name: string,
    id: number,
    title: string,
    options: Option[]
}

export interface Option {
    description: string,
    role_name: string,
    button_text: string,
    button_emoji: string,
    button_style: string,
    toggle: boolean
}