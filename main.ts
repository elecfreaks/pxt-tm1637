/**
 * Display interface for TM1637 chip
 */
//%color=#9F79EE icon="\uf108" block="7-Segment display"
namespace display {
    let TubeTab: number[] = [
    0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07,
    0x7f, 0x6f, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71]
    export enum Jpin_segment {
        //% block="J1 (P13,P14)"
        J1 = 1,
        //% block="J2 (P15,P16)"
        J2 = 2
    }
    /**
     * Create a new driver Grove - 4-Digit Display
     * @param clkPin value of clk pin number
     * @param dataPin value of data pin number
     */
    //% blockId=grove_tm1637_create block="connect 4-Digit Display |pin %pin|"
    export function createDisplay(jpin: Jpin_segment): TM1637 {
        let display = new TM1637()
        switch (jpin) {
            case 1:
                display.clkPin = DigitalPin.P14
                display.dataPin = DigitalPin.P13
                break;
            case 2:
                display.clkPin = DigitalPin.P16
                display.dataPin = DigitalPin.P15
                break;
        }
        display.buf = pins.createBuffer(4)
        display.brightnessLevel = 7
        display.pointFlag = false
        display.clear()
        return display
    }
    export class TM1637 {
        clkPin: DigitalPin
        dataPin: DigitalPin
        brightnessLevel: number
        pointFlag: boolean
        buf: Buffer

        private writeByte(wrData: number) {
            for (let i = 0; i < 8; i++) {
                pins.digitalWritePin(this.clkPin, 0)
                if (wrData & 0x01) pins.digitalWritePin(this.dataPin, 1)
                else pins.digitalWritePin(this.dataPin, 0)
                wrData >>= 1
                pins.digitalWritePin(this.clkPin, 1)
            }

            pins.digitalWritePin(this.clkPin, 0) // Wait for ACK
            pins.digitalWritePin(this.dataPin, 1)
            pins.digitalWritePin(this.clkPin, 1)
        }

        private start() {
            pins.digitalWritePin(this.clkPin, 1)
            pins.digitalWritePin(this.dataPin, 1)
            pins.digitalWritePin(this.dataPin, 0)
            pins.digitalWritePin(this.clkPin, 0)
        }

        private stop() {
            pins.digitalWritePin(this.clkPin, 0)
            pins.digitalWritePin(this.dataPin, 0)
            pins.digitalWritePin(this.clkPin, 1)
            pins.digitalWritePin(this.dataPin, 1)
        }

        private coding(dispData: number): number {
            let pointData = 0

            if (dispData == 0x7f) dispData = 0x00
            else if (dispData == 0x3f) dispData = 0x3f
            else dispData = TubeTab[dispData] + pointData

            return dispData
        }

        /**
         * Show a 4 digits number on display
         * @param dispData value of number
         */
        //% blockId=grove_tm1637_display_number block="%strip|show number|%dispData"
        show(dispData: number, fillWithZeros = false) {
            let def = 0x7f
            if (fillWithZeros)
                def = 0x3f
            if (dispData < 10) {
                this.bit(dispData, 3)
                this.bit(def, 2)
                this.bit(def, 1)
                this.bit(def, 0)

                this.buf[3] = dispData
                this.buf[2] = def
                this.buf[1] = def
                this.buf[0] = def
            }
            else if (dispData < 100) {
                this.bit(dispData % 10, 3)
                this.bit((dispData / 10) % 10, 2)
                this.bit(def, 1)
                this.bit(def, 0)

                this.buf[3] = dispData % 10
                this.buf[2] = (dispData / 10) % 10
                this.buf[1] = def
                this.buf[0] = def
            }
            else if (dispData < 1000) {
                this.bit(dispData % 10, 3)
                this.bit((dispData / 10) % 10, 2)
                this.bit((dispData / 100) % 10, 1)
                this.bit(def, 0)

                this.buf[3] = dispData % 10
                this.buf[2] = (dispData / 10) % 10
                this.buf[1] = (dispData / 100) % 10
                this.buf[0] = def
            }
            else {
                this.bit(dispData % 10, 3)
                this.bit((dispData / 10) % 10, 2)
                this.bit((dispData / 100) % 10, 1)
                this.bit((dispData / 1000) % 10, 0)

                this.buf[3] = dispData % 10
                this.buf[2] = (dispData / 10) % 10
                this.buf[1] = (dispData / 100) % 10
                this.buf[0] = (dispData / 1000) % 10
            }
        }

        /**
         * Set the brightness level of display at from 0 to 7
         * @param level value of brightness level
         */
        //% blockId=grove_tm1637_set_display_level block="%strip|brightness level to|%level"
        //% level.min=0 level.max=7
        set(level: number) {
            this.brightnessLevel = level

            this.bit(this.buf[0], 0x00)
            this.bit(this.buf[1], 0x01)
            this.bit(this.buf[2], 0x02)
            this.bit(this.buf[3], 0x03)
        }

        /**
         * Show a single number from 0 to 9 at a specified digit of Grove - 4-Digit Display
         * @param dispData value of number
         * @param bitAddr value of bit number
         */
        //% blockId=grove_tm1637_display_bit block="%strip|show single number|%dispData|at digit|%bitAddr"
        //% dispData.min=0 dispData.max=9
        //% bitAddr.min=0 bitAddr.max=3
        bit(dispData: number, bitAddr: number) {
            if ((dispData == 0x7f) || (dispData == 0x3f) || ((dispData <= 9) && (bitAddr <= 3))) {
                let segData = 0

                if (bitAddr == 1 && this.pointFlag)
                    segData = this.coding(dispData) + 0x80
                else
                    segData = this.coding(dispData)
                this.start()
                this.writeByte(0x44)
                this.stop()
                this.start()
                this.writeByte(bitAddr | 0xc0)
                this.writeByte(segData)
                this.stop()
                this.start()
                this.writeByte(0x88 + this.brightnessLevel)
                this.stop()

                this.buf[bitAddr] = dispData
            }
        }

        /**
         * Turn on or off the colon point on Grove - 4-Digit Display
         * @param pointEn value of point switch
         */
        //% blockId=grove_tm1637_display_point block="%strip|turn|%point|colon point"
        point(b: boolean) {
            this.pointFlag = b
            this.bit(this.buf[1], 0x01)
        }

        /**
         * Clear the display
         */
        //% blockId=grove_tm1637_display_clear block="%strip|clear"
        clear() {
            this.bit(0x7f, 0x00)
            this.bit(0x7f, 0x01)
            this.bit(0x7f, 0x02)
            this.bit(0x7f, 0x03)
        }
    }
}