const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const ATLAS_URI = "mongodb+srv://<purnavillage_db_user>:<PurnaVoter2026>@cluster0.myu0qt6.mongodb.net/?appName=Cluster0";

// Helper function to convert {$oid: '...'} into a format Mongoose accepts
function formatData(data) {
    return data.map(doc => {
        const newDoc = { ...doc };
        for (const key in newDoc) {
            // Fix ObjectIds
            if (newDoc[key] && typeof newDoc[key] === 'object' && newDoc[key].$oid) {
                newDoc[key] = newDoc[key].$oid;
            }
            // Fix Dates (if any exist in your files)
            if (newDoc[key] && typeof newDoc[key] === 'object' && newDoc[key].$date) {
                newDoc[key] = newDoc[key].$date;
            }
        }
        return newDoc;
    });
}

async function dumpAllData() {
    try {
        await mongoose.connect(ATLAS_URI);
        console.log("✅ Connected to MongoDB Atlas");

        const filesToImport = [
            { file: 'voting.users.json', collection: 'users' }
        ];

        for (const item of filesToImport) {
            const filePath = path.join(__dirname, item.file); 
            
            if (fs.existsSync(filePath)) {
                let rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                // Format the data to remove $oid wrappers
                const cleanedData = formatData(Array.isArray(rawData) ? rawData : [rawData]);
                
                const Model = mongoose.model(item.collection, new mongoose.Schema({}, { strict: false }), item.collection);
                
                await Model.insertMany(cleanedData);
                console.log(`🚀 Imported ${cleanedData.length} records into [${item.collection}]`);
                
                delete mongoose.connection.models[item.collection];
            } else {
                console.log(`⚠️ File not found: ${item.file}`);
            }
        }

        console.log("\n✨ All migrations complete!");
        process.exit();
    } catch (err) {
        console.error("❌ Error during dump:", err);
        process.exit(1);
    }
}

dumpAllData();


// Excel

// const mongoose = require('mongoose');
// const path = require('path');
// const xlsx = require('xlsx'); // Import the xlsx library

// const ATLAS_URI = "mongodb+srv://bharatsharma:India%406427@users.zhyvuoo.mongodb.net/purna_full?retryWrites=true&w=majority";

// async function dumpExcelData() {
//     try {
//         await mongoose.connect(ATLAS_URI);
//         console.log("✅ Connected to MongoDB Atlas");

//         const fileName = 'Voter_List_English.xlsx';
//         const filePath = path.join(__dirname, fileName);

//         // 1. Read the Workbook
//         const workbook = xlsx.readFile(filePath);
        
//         // 2. Select the first sheet (change index if you have multiple sheets)
//         const sheetName = workbook.SheetNames[0];
//         const worksheet = workbook.Sheets[sheetName];

//         // 3. Convert Excel data to JSON
//         const jsonData = xlsx.utils.sheet_to_json(worksheet);

//         if (jsonData.length === 0) {
//             console.log("⚠️ The Excel sheet is empty.");
//             process.exit();
//         }

//         console.log(`📊 Found ${jsonData.length} records in Excel...`);

//         // 4. Define a flexible Schema and Model
//         // Change 'voters' to whatever collection name you prefer
//         const collectionName = 'voters';
//         const Model = mongoose.model(collectionName, new mongoose.Schema({}, { strict: false }), collectionName);

//         // 5. Insert into Atlas
//         await Model.insertMany(jsonData);
//         console.log(`🚀 Successfully imported ${jsonData.length} records into [${collectionName}]`);

//         console.log("\n✨ Migration complete!");
//         process.exit();
//     } catch (err) {
//         console.error("❌ Error during dump:", err);
//         process.exit(1);
//     }
// }

// dumpExcelData();