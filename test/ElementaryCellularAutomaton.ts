import { expect } from "chai";
import { ethers } from "hardhat";
import { start } from "repl";

describe("ElementaryCellularAutomaton", function () {

    it("simple test", async function () {
        const contract = await ethers.deployContract("ElementaryCellularAutomaton", [[1], 1]);
        await contract.next(30, 1);

        await contract.next(30, 5);

        const show = async () => console.log(await contract.print());
        await show()

        await contract.next(30, 5);
        await show()
        console.log("Heres more applications of the rule, but I'm not going to print it")
        const startTimer = () => {
            const start = Date.now()
            return () => {
                const end = Date.now()
                console.log(`${end - start}ms`)
            }
        }
        const timer = startTimer()
        await contract.next(30, 16);
        timer()
        await contract.next(30, 16);
        timer()
        await contract.next(30, 16);
        timer()
        await contract.next(30, 8);
        timer()
        console.log("done")
    });

    it("Check bitmap is as expected", async function () {
        const a = await ethers.deployContract("ElementaryCellularAutomaton", [[1], 1]);

        // check that the bitmap is as expected at a specific index
        const expectBitmapAtNToBe = async (n: number, expected: number) => {
            if (expected !== 0 && expected !== 1)
                throw new Error("expected must be 0 or 1")

            const wordIndex = Math.floor(n / 256)
            const bitIndex: bigint = BigInt(n % 256)
            const word = await a['bitmap'](wordIndex)
            const bit = (word >> bitIndex) & BigInt(1)

            expect(bit).to.equal(BigInt(expected))
        }
        await expectBitmapAtNToBe(0, 1)


        // apply rule 30 1 time
        await a.next(30, 1)
        await expectBitmapAtNToBe(0, 1)
        await expectBitmapAtNToBe(1, 1)
        await expectBitmapAtNToBe(2, 1)

        await a.next(30, 1)
        await expectBitmapAtNToBe(0, 1)
        await expectBitmapAtNToBe(1, 1)
        await expectBitmapAtNToBe(2, 0)
        await expectBitmapAtNToBe(3, 0)
        await expectBitmapAtNToBe(4, 1)

        await a.next(30, 1)
        await expectBitmapAtNToBe(0, 1)
        await expectBitmapAtNToBe(1, 1)
        await expectBitmapAtNToBe(2, 0)
        await expectBitmapAtNToBe(3, 1)
        await expectBitmapAtNToBe(4, 1)
        await expectBitmapAtNToBe(5, 1)
        await expectBitmapAtNToBe(6, 1)

        // next thing to do is implement rule 30 here in typescript and check it matches the contract as they proceed through the generations
        // that way we can test an arbitrary number of generations

    });

    it("Start with an initial bitmap that is just under 256 bits", async function () {
        // initial seed is 255 random bits
        const initialSeed = Array.from({ length: 254 }, () => Math.floor(Math.random() * 2)).join('')
        console.log(`initialSeed: ${initialSeed}`)
        const seedAsBigInt = BigInt(`0b${initialSeed}`)
        const a = await ethers.deployContract("ElementaryCellularAutomaton", [[seedAsBigInt], 254]);

        // call next a few times such that we cross over the threshold of 256 bits and start writing to the next word
        {
            const gasLimit = await a.next.estimateGas(30, 1);
            console.log(`gasLimit: ${gasLimit}`)
        }
        await a.next(30, 1)
    });

    it.only("Gas estimate depends on current state of the bitmap", async function () {
        // create a contract with small initial conditions .. 
        const a = await ethers.deployContract("ElementaryCellularAutomaton", [[1], 1]);

        // .. and another contract with large initial conditions
        const randomSeed = (_length : number) : string => `0b${Array.from({ length: _length }, () => Math.floor(Math.random() * 2)).join('')}`
        const b = await ethers.deployContract("ElementaryCellularAutomaton", [[BigInt(randomSeed(254))], 254]);

        const a_est = await a.next.estimateGas(30, 1);
        const b_est = await b.next.estimateGas(30, 1);

        console.log(`a_est: ${a_est}`)
        console.log(`b_est: ${b_est}`)

        console.log(`Prediction b_est will be significantly larger than a_est: ${b_est > a_est}`)

        const c = await ethers.deployContract("ElementaryCellularAutomaton", [[BigInt(randomSeed(256)), BigInt(randomSeed(50))], 306]);

        const c_est = await c.next.estimateGas(30, 1);
        console.log(`c_est: ${c_est}`)
    });

})
