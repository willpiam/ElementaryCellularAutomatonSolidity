import { expect } from "chai";
import { ethers } from "hardhat";
import fs from 'fs';

const wordSize = 8

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

const saveGasRecord = (gasLimitEstimate: number, generationSize: number) => {
    if (!fs.existsSync('./gas_records/'))
        fs.mkdirSync('./gas_records/');

    if (!fs.existsSync('./gas_records/data.json'))
        fs.writeFileSync('./gas_records/data.json', '[]')

    const data = JSON.parse(fs.readFileSync('./gas_records/data.json', 'utf8'))

    data.push({
        gasLimitEstimate,
        generationSize,
        timestamp: Date.now(),
        humanTimestamp: new Date().toLocaleString(),
    })

    fs.writeFileSync('./gas_records/data.json', JSON.stringify(data, null, 2))
}

describe("ElementaryCellularAutomaton", function () {

    it("simple test", async function () {
        const seedSize = 5
        // const seedSize = 32 
        // const initialConditions = randomSeed(seedSize)
        const initialConditions = '10001'
        // const initialConditions = '0b1'
        console.log(`initialConditions: ${initialConditions}`)
        const contract = await ethers.deployContract("ElementaryCellularAutomaton", [['0b' + initialConditions], seedSize]);
        // const rule = 255
        const rule = 30
        console.log(`About to apply rule ${rule} to initial conditions ${initialConditions} twice`)
        await contract.next(rule, 2);
        console.log(`Rule applied.`)
        const onchainResult = await contract.bitmap(0)
        console.log(`----- onchainResult:  ${onchainResult.toString(2)} -----`)

        console.log(`About to apply rule ${rule} five more times`)
        await contract.next(rule, 5);
        console.log(`Rule applied.`)

        const show = async () => console.log(await contract.print());
        await show()

        await contract.next(rule, 5);
        await show()

        const batchSize = 4

        for (let i = 0; i < 1; i++) {
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
            const wordIndex = Math.floor(reverseN / wordSize)
            const bitIndex: bigint = BigInt(reverseN % wordSize)
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

    it("Start with an initial bitmap that is just under 8 bits", async function () {
        // initial seed is 255 random bits
        const initialSeed = Array.from({ length: 7 }, () => Math.floor(Math.random() * 2)).join('')
        console.log(`initialSeed: ${initialSeed}`)
        // const seedAsBigInt = BigInt(`0b${initialSeed}`)
        const a = await ethers.deployContract("ElementaryCellularAutomaton", [['0b' + initialSeed], 7]);

        // call next a few times such that we cross over the threshold of 256 bits and start writing to the next word
        {
            const gasLimit = await a.next.estimateGas(30, 1);
            console.log(`gasLimit: ${gasLimit}`)
        }
        await a.next(30, 1)
        await a.next(30, 1)
    });

    it("Gas estimate depends on current state of the bitmap", async function () {

        // create a contract with small initial conditions .. 
        const a = await ethers.deployContract("ElementaryCellularAutomaton", [[1], 1]);

        // .. and another contract with large initial conditions
        const b = await ethers.deployContract("ElementaryCellularAutomaton", [[randomSeed(8), randomSeed(8)], 16]);

        const a_est = await a.next.estimateGas(30, 1);
        saveGasRecord(parseInt(a_est.toString()), 1)
        const b_est = await b.next.estimateGas(30, 1);
        saveGasRecord(parseInt(b_est.toString()), 254)

        console.log(`a_est: ${a_est}`)
        console.log(`b_est: ${b_est}`)

        console.log(`Prediction b_est will be significantly larger than a_est: ${b_est > a_est}`)

        const c = await ethers.deployContract("ElementaryCellularAutomaton", [[randomSeed(8), randomSeed(8), randomSeed(8), randomSeed(8)], 32]);

        const c_est = await c.next.estimateGas(30, 1);
        saveGasRecord(parseInt(c_est.toString()), 306)
        console.log(`c_est: ${c_est}`)
    });

    it.only("On-chain computation matches off-chain computation", async function () {
        // const seedSize = 1
        const seedSize = 8 
        const initialConditions = randomSeed(seedSize)
        // const initialConditions = '0b1'
        console.log(`initialConditions: ${initialConditions}`)

        // initial considitions looks like "0b010101010101000101010101011101010" where the length is arbitrary
        // 1. drop the 0b prefix
        // 2. split the string into an array of 8 bit chunks
        // 3. add the prefix back to each chunk
        // 4. store all the chunks in an array
        const eightBitInitialConditions: string[] = initialConditions.slice(2).match(/.{1,8}/g)!.map(chunk => "0b" + chunk);

        console.log(`eightBitInitialConditions: ${JSON.stringify(eightBitInitialConditions, null, 2)}`)


        // const eightBitInitialConditions : string[] = // complete this
        const a = await ethers.deployContract("ElementaryCellularAutomaton", [eightBitInitialConditions, seedSize]);
        console.log(`Contract deployed`)

        // apply rule 30 a single time via the contract
        await a.next(30, 1)
        console.log(`Rule applied.`)
        const resultingGenerationSize = await a['generationSize']()
        console.log(`resultingGenerationSize: ${resultingGenerationSize}`)

        // const onchainResult = await a.bitmap(0)
        const buildBitmap = async () : Promise<string> => {

            const generationSize = await a['generationSize']()

            // const bitmapWordCount = (generationSize / BigInt(wordSize)) + ( generationSize % BigInt(wordSize) === 0n ? 0n : 1n )
            const bitmapWordCount = (generationSize / BigInt(wordSize)) + 1n

            console.log(`[buildBitMap] bitmapWordCount: ${bitmapWordCount}`)
            

            let bitmap = ''

            for (let i = 0n; i < bitmapWordCount; i++) {
                console.log(`[buildBitMap] i: ${i}`)
                const word = (await a['bitmap'](i)).toString(2).padStart(wordSize, '0')

                bitmap += word
            }

            return bitmap
        }

        const onchainResult : string = await buildBitmap()
        // console.log(`----- onchainResult:  ${onchainResult.toString(2)} -----`)
        console.log(`----- onchainResult:  ${onchainResult} -----`)


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

            // setup the map defining the behaviour of the rule
            parents.forEach((parent: [boolean, boolean, boolean], index) => ruleMap.set(JSON.stringify(parent), ruleAsBinary[index] === '1'))

            const bitmapOfBools: boolean[] = bitmap.split('').map((bit) => bit === '1')

            const nextGeneration = []

            for (let i = 1; i < bitmapOfBools.length + 1; i++) {
                const left: boolean = bitmapOfBools[i - 1] ?? false
                const middle: boolean = bitmapOfBools[i] ?? false
                const right: boolean = bitmapOfBools[i + 1] ?? false

                const parent: [boolean, boolean, boolean] = [left, middle, right]
                const nextBit = ruleMap.get(JSON.stringify(parent))

                if (nextBit === undefined)
                    throw new Error(`nextBit should not be undefined ${parent}`)

                nextGeneration.push(nextBit ? '1' : '0')
            }

            return nextGeneration.join('')
        }

        const offchainResult = applyRule(initialConditions, 30n)
        console.log(`----- initialConditions:       ${initialConditions.substring(2)} -----`)
        console.log(`----- onchainResult:           ${onchainResult} -----`)
        console.log(`----- offchainResult:          ${offchainResult} -----`)

        // const onChainResultAsString = onchainResult.toString(2).padStart(parseInt(resultingGenerationSize.toString()), '0')
        // console.log(`----- onChainResultAsString:   ${onChainResultAsString} -----`)

        // expect(onChainResultAsString).to.equal(offchainResult)
        expect(onchainResult).to.equal(offchainResult)
    });
})