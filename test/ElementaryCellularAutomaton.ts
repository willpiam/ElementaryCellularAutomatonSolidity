import { expect } from "chai";
import { ethers } from "hardhat";

const randomSeed = (_length: number): string => `0b${Array.from({ length: _length }, () => Math.floor(Math.random() * 2)).join('')}`

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

    it("Gas estimate depends on current state of the bitmap", async function () {
        // create a contract with small initial conditions .. 
        const a = await ethers.deployContract("ElementaryCellularAutomaton", [[1], 1]);

        // .. and another contract with large initial conditions
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

    it.only("On-chain computation matches off-chain computation", async function () {
        const seedSize = 3
        const initialConditions = randomSeed(seedSize)
        // const initialConditions = '1'
        console.log(`initialConditions: ${initialConditions}`)

        const a = await ethers.deployContract("ElementaryCellularAutomaton", [[BigInt(initialConditions)], seedSize]);

        // apply rule 30 a single time via the contract
        await a.next(30, 1)

        const onchainResult = await a.bitmap(0)
        console.log(`onchainResult:  ${onchainResult.toString(2)}`)

        // apply rule 30 a single time off-chain   
        const applyRule = (bitmap: bigint, rule: bigint) => {
            if (rule > 255n)
                throw new Error("Rule must be between 0 and 255")

            const ruleAsBinary = rule.toString(2).padStart(8, '0')
            const ruleMap = ruleAsBinary.split('')

            const nextGeneration = []

            const bitmapAsBinary = ['0', '0', ...(bitmap.toString(2).split('')), '0', '0']
            console.log(`bitmapAsBinary: ${bitmapAsBinary}`)

            for (let i = 1; i < bitmapAsBinary.length - 1; i++) {
                const left = bitmapAsBinary[i - 1]
                const center = bitmapAsBinary[i]
                const right = bitmapAsBinary[i + 1]
                console.log(`i is ${i}, left: ${left}, center: ${center}, right: ${right}`)
                if (left === undefined || center === undefined || right === undefined) {
                    throw new Error(`Something went wrong (left: ${left}, center: ${center}, right: ${right})`)
                }

                if ((left === '1') && (center === '1') && (right === '1')) {
                    nextGeneration.push(ruleMap[0])
                    continue
                }

                if ((left === '1') && (center === '1') && (right === '0')) {
                    nextGeneration.push(ruleMap[1])
                    continue
                }

                if ((left === '1') && (center === '0') && (right === '1')) {
                    nextGeneration.push(ruleMap[2])
                    continue
                }

                if ((left === '1') && (center === '0') && (right === '0')) {
                    nextGeneration.push(ruleMap[3])
                    continue
                }

                if ((left === '0') && (center === '1') && (right === '1')) {
                    nextGeneration.push(ruleMap[4])
                    continue
                }

                if ((left === '0') && (center === '1') && (right === '0')) {
                    nextGeneration.push(ruleMap[5])
                    continue
                }

                if ((left === '0') && (center === '0') && (right === '1')) {
                    nextGeneration.push(ruleMap[6])
                    continue
                }

                if ((left === '0' && (center === '0') && right === '0')) {
                    nextGeneration.push(ruleMap[7])
                    continue
                }

            }

            console.log(`nextGeneration: ${nextGeneration}`)
            return BigInt(`0b${nextGeneration.join('')}`)
        }

        const offchainResult = applyRule(BigInt(initialConditions), 30n)
        console.log(`offchainResult: ${offchainResult.toString(2)}`)


        expect(onchainResult).to.equal(offchainResult)



    });

})
