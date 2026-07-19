export function parseOrderDueDate(value: string | undefined, now = new Date()): Date | null {
    const trimmed = value?.trim()
    if (!trimmed) return null

    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
        ? new Date(`${trimmed}T23:59:59.999+07:00`)
        : new Date(trimmed)

    if (!Number.isFinite(dueDate.getTime())) {
        throw new Error("Due date tidak valid")
    }

    if (dueDate.getTime() <= now.getTime()) {
        throw new Error("Due date harus setelah waktu saat ini")
    }

    return dueDate
}
