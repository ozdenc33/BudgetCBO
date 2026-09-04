import { afterEach, describe, expect, it, vi } from 'vitest'
import { commitWrite } from './firestoreWrite'

function setOnline(value: boolean | undefined) {
  if (value === undefined) {
    // @ts-expect-error test ortaminda navigator kurgulaniyor
    delete globalThis.navigator
    return
  }
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: value },
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  setOnline(undefined)
  vi.useRealTimers()
})

describe('commitWrite', () => {
  it('sunucu onayi gelirse synced doner', async () => {
    setOnline(true)
    await expect(commitWrite(Promise.resolve())).resolves.toBe('synced')
  })

  it('cevrimdisiyken beklemeden pending doner', async () => {
    setOnline(false)
    // Hic cozulmeyen bir yazma: cevrimdisi Firestore davranisi budur.
    const never = new Promise<void>(() => {})
    await expect(commitWrite(never)).resolves.toBe('pending')
  })

  it('cevrimici ama yavassa sureyi asinca pending doner', async () => {
    setOnline(true)
    vi.useFakeTimers()
    const never = new Promise<void>(() => {})
    const result = commitWrite(never)
    await vi.advanceTimersByTimeAsync(1000)
    await expect(result).resolves.toBe('pending')
  })

  it('erken gelen hatayi cagirana firlatir', async () => {
    setOnline(true)
    await expect(commitWrite(Promise.reject(new Error('reddedildi')))).rejects.toThrow('reddedildi')
  })

  it('gec gelen hatayi onLateError ile bildirir', async () => {
    setOnline(true)
    vi.useFakeTimers()
    let reject: (err: unknown) => void = () => {}
    const slow = new Promise<void>((_, r) => {
      reject = r
    })
    const onLateError = vi.fn()
    const result = commitWrite(slow, onLateError)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await result).toBe('pending')

    reject(new Error('sonradan reddedildi'))
    await vi.advanceTimersByTimeAsync(0)
    expect(onLateError).toHaveBeenCalledTimes(1)
  })
})
