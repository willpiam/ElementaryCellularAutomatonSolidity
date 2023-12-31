import { expect } from "chai";
import { ethers } from "hardhat";

describe("NaiveElementaryCellularAutomaton", function () {

    it("deploy", async function () {
        const contract = await ethers.deployContract("NaiveElementaryCellularAutomaton");
        await contract.next(30, 1);
        await contract.next(30, 5);

        const show = async () => console.log(await contract.print());
        await show()

        await contract.next(30, 5);
        await show()
        console.log("done")

    });

    it("Check bitmap is as expected", async function () {
        const a = await ethers.deployContract("NaiveElementaryCellularAutomaton");

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

})
