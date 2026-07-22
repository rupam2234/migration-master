import { ReactNode } from "react"

export type StepTypes = {
    number: string,
    title: string,
    image?: string,
    alt?: string,
    body: ReactNode
}