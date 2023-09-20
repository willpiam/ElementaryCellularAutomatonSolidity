import { expect } from "chai";
import { ethers } from "hardhat";
import fs from 'fs';

const randomSeed = (_length: number): string => `0b${Array.from({ length: _length }, () => Math.floor(Math.random() * 2)).join('')}`

const saveImage = async (contract: any) => {
    const pbm: string = await contract.printPBM();
    if (!fs.existsSync('./pbm_images/'))
        fs.mkdirSync('./pbm_images/');

    const filenameA = `./pbm_images/${Date.now()}.pbm`
    fs.writeFileSync(filenameA, pbm)

    const filenameB = `./pbm_images/latest.pbm`
    fs.writeFileSync(filenameB, pbm)
}

describe("ElementaryCellularAutomaton", function () {

    it("simple test", async function () {
        const seedSize = 11
        // const seedSize = 32 
        // const initialConditions = randomSeed(seedSize)
        const initialConditions = '0b10000000001'
        // const initialConditions = '0b1'
        console.log(`initialConditions: ${initialConditions}`)
        // const contract = await ethers.deployContract("ElementaryCellularAutomaton", [initialConditions, seedSize]);
        const contract = await ethers.deployContract("ElementaryCellularAutomaton", [[BigInt(initialConditions)], seedSize]);
        // const rule = 255
        const rule = 30
        await contract.next(rule, 2);
        const onchainResult = await contract.bitmap(0)
        console.log(`----- onchainResult:  ${onchainResult.toString(2)} -----`)

        await contract.next(rule, 5);

        const show = async () => console.log(await contract.print());
        await show()

        await contract.next(rule, 5);
        await show()

        const batchSize = 4 

        for (let i = 0; i < 2; i++) { 
            await contract.next(rule, batchSize);
            console.log(`${i + 1}. Just Finished A Batch Of ${batchSize}`)
        }

        const pSaveImage = saveImage(contract)

        console.log("Saving image")
        setTimeout(async () => {
            console.log("Saving image 2")
            await pSaveImage
        }, 40_000)


        console.log("done")
    });

    it("Check bitmap is as expected", async function () {
        const a = await ethers.deployContract("ElementaryCellularAutomaton", [[1], 1]);

        // check that the bitmap is as expected at a specific index
        const expectBitmapAtNToBe = async (n: number, expected: number) => {
            if (expected !== 0 && expected !== 1)
                throw new Error("expected must be 0 or 1")

            const reverseN = parseInt(((await a['generationSize']()) - BigInt(n) - BigInt(1)).toString())
            const wordIndex = Math.floor(reverseN / 256)
            const bitIndex: bigint = BigInt(reverseN % 256)
            const word = await a['bitmap'](wordIndex)
            console.log(`Word is ${word.toString(2)}`)
            const bit = (word >> bitIndex) & BigInt(1)

            expect(bit).to.equal(BigInt(expected))
        }
        await expectBitmapAtNToBe(0, 1)


        // apply rule 30 1 time
        await a.next(30, 1)
        await expectBitmapAtNToBe(0, 1)
        await expectBitmapAtNToBe(1, 1)
        await expectBitmapAtNToBe(2, 1)
        console.log(`Generation 2 Evaluated`)

        await a.next(30, 1)
        await expectBitmapAtNToBe(0, 1)
        await expectBitmapAtNToBe(1, 1) // frist previous bit is here?
        await expectBitmapAtNToBe(2, 0)
        await expectBitmapAtNToBe(3, 0)
        await expectBitmapAtNToBe(4, 1)
        console.log(`Generation 3 Evaluated`)

        await a.next(30, 1)
        await expectBitmapAtNToBe(0, 1)
        await expectBitmapAtNToBe(1, 1)
        await expectBitmapAtNToBe(2, 0)
        await expectBitmapAtNToBe(3, 1)
        await expectBitmapAtNToBe(4, 1)
        await expectBitmapAtNToBe(5, 1)
        await expectBitmapAtNToBe(6, 1)
        console.log(`Generation 4 Evaluated`)
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

    it("On-chain computation matches off-chain computation", async function () {
        const seedSize = 250
        const initialConditions = randomSeed(seedSize)
        console.log(`initialConditions: ${initialConditions}`)

        const a = await ethers.deployContract("ElementaryCellularAutomaton", [[BigInt(initialConditions)], seedSize]);

        // apply rule 30 a single time via the contract
        await a.next(30, 1)
        const resultingGenerationSize = await a['generationSize']()

        const onchainResult = await a.bitmap(0)
        console.log(`----- onchainResult:  ${onchainResult.toString(2)} -----`)

        // apply rule 30 a single time off-chain   
        const applyRule = (bitmap: string, rule: bigint): string => {
            if (rule < 0n || rule > 255n)
                throw new Error("rule must be between 0 and 255")

            const ruleMap = new Map<string, boolean>();
            const parents: [boolean, boolean, boolean][] = [
                [true, true, true],
                [true, true, false],
                [true, false, true],
                [true, false, false],
                [false, true, true],
                [false, true, false],
                [false, false, true],
                [false, false, false],
            ]

            const ruleAsBinary = rule.toString(2).padStart(8, '0').split('')
            console.log(`ruleAsBinary: ${ruleAsBinary}`)

            // setup the map defining the behaviour of the rule
            parents.forEach((parent: [boolean, boolean, boolean], index) => ruleMap.set(JSON.stringify(parent), ruleAsBinary[index] === '1'))

            const bitmapOfBools: boolean[] = bitmap.split('').map((bit) => bit === '1')
            console.log(`bitmapOfBools: ${JSON.stringify(bitmapOfBools, null, 2)}`)

            const nextGeneration = []

            for (let i = 1; i < bitmapOfBools.length + 1; i++) {
                const left: boolean = bitmapOfBools[i - 1] ?? false
                const middle: boolean = bitmapOfBools[i] ?? false
                const right: boolean = bitmapOfBools[i + 1] ?? false

                const parent: [boolean, boolean, boolean] = [left, middle, right]
                console.log(parent)
                const nextBit = ruleMap.get(JSON.stringify(parent))

                if (nextBit === undefined)
                    throw new Error(`nextBit should not be undefined ${parent}`)

                nextGeneration.push(nextBit ? '1' : '0')
            }

            return nextGeneration.join('')
        }

        const offchainResult = applyRule(initialConditions, 30n)
        console.log(`----- initialConditions:       ${initialConditions} -----`)
        console.log(`----- onchainResult:           ${onchainResult.toString(2)} -----`)
        console.log(`----- offchainResult:          ${offchainResult} -----`)

        const onChainResultAsString = onchainResult.toString(2).padStart(parseInt(resultingGenerationSize.toString()), '0')
        console.log(`----- onChainResultAsString:   ${onChainResultAsString} -----`)

        expect(onChainResultAsString).to.equal(offchainResult)
    });
})