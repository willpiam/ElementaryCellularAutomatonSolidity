import { ethers } from "hardhat";

describe("ElementaryCellularAutomaton", function () {

    it("deploy", async function () {
        const contract = await ethers.deployContract("ElementaryCellularAutomaton");

        await contract.next(30, 30);

        const show = async () => console.log(await contract.print());
        await show()
        
        await contract.next(30, 10);
        await show()
        console.log("done")

    });



})
