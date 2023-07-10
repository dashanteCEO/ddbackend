const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const { GridFsStorage } = require("multer-gridfs-storage");
const { default: mongoose } = require("mongoose");
require("dotenv").config();
const { v4: uuidv4 } = require('uuid'); 

let gfs = new mongoose.mongo.GridFSBucket(mongoose.connection, {
  bucketName: "uploads",
  chunkSizeBytes: 1024,
});

let groupId = null; 

const storage = new GridFsStorage({
  db: mongoose.connection,
  file: (req, file) => {
    const fn = async (req) => {
      const { filename } = await GridFsStorage.generateBytes();
      const brand= req.body.brand;
      const year= req.body.year;
      const color= req.body.color;
      const bodyType= req.body.bodyType;
      const model= req.body.model;
      const specs= req.body.specs;
      const seats= req.body.seats;
      const mileage= req.body.mileage;
      const feul= req.body.feul;
      const trim= req.body.trim;
      const transmission= req.body.transmission;
      const steering= req.body.steering;
      const price= req.body.price;
      const id = new mongoose.Types.ObjectId();
      
      if (!groupId) {
        groupId = uuidv4();
        return {
          id,
          filename: `${id}-${filename}${path.extname(file.originalname)}`,
          bucketName: "uploads",
          metadata: {
            groupId,
            brand,
            year,
            color,
            bodyType,
            model,
            specs,
            seats,
            mileage,
            feul,
            transmission,
            steering,
            price,
            trim
          },
        };
      } else {
        return {
          id,
          filename: `${id}-${filename}${path.extname(file.originalname)}`,
          bucketName: "uploads",
          metadata: {}
        };
      }
    };
    return fn(req);
  },
});


//Images
const upload = multer({storage});

router.post("/upload", upload.array("post"), async(req, res) => {
  groupId = null    
    res.send(req.files)
});

router.get("/assets/:filename", (req, res) => {
  const { filename } = req.params;
  gfs.find({ filename }, (error, file) => {
    if (error) return res.status(500).send(error.message);
    if (!file) {return res.status(404).send("That image was not found")}

    res.set("Cache-Control", "public, max-age=600");

    const stream = gfs.openDownloadStreamByName(filename);
    stream.pipe(res);
  });
});

router.delete("/delete/:groupId", async (req, res) => {
  try {
    const groupId = req.params.groupId; 
    const files = await gfs.find({ "metadata.groupId": groupId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).send("No files found for the given groupId");
    }
    const deletePromises = files.map((file) => {
        gfs.delete(file._id, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          } 
      });
    });
    res.send(`All files with groupId ${groupId} have been deleted`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

router.get("/vehicles/:bodyType", async (req, res) => {
  try {
    const files = await gfs.find().toArray();
    const bodyType = req.params.bodyType
    const filteredFiles = files.filter((file) => {
      return file.metadata && file.metadata.bodyType && file.metadata.bodyType === bodyType; // convert to lowercase
    });
    
    if (!filteredFiles || filteredFiles.length === 0) {
      return res.status(404).send("No vehicles found with the specified bodyType");
    }
    
    const groups = {};

    filteredFiles.forEach((file) => {
      if (file.metadata && file.metadata.groupId) {
        const groupId = file.metadata.groupId;
        const brand = file.metadata.brand;
        const model = file.metadata.model;
        const color = file.metadata.color;
        const year = file.metadata.year;
        const specs = file.metadata.specs;
        const mileage = file.metadata.mileage
        const seats = file.metadata.seats
        const feul = file.metadata.feul
        const transmission = file.metadata.transmission
        const steering = file.metadata.steering
        const price = file.metadata.price
        const trim = file.metadata.trim
        if (!groups[groupId]) {
          groups[groupId] = {
            groupId,
            url: `https://ddauto.up.railway.app/api/post/assets/${file.filename}`,
            brand: brand,
            model: model,
            year: year,
            color: color,
            specs: specs,
            bodyType: bodyType,
            mileage: mileage,
            feul:feul,
            steering: steering,
            transmission: transmission,
            seats:seats,
            price:price,
            trim:trim
          };
        }
      }
    });
    
    res.send(Object.values(groups));
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});


router.get("/featured", async (req, res) => {
  try {
    const files = await gfs.find().toArray();
    // Does file exist?
    if (!files || files.length === 0) {
      return res.status(404).send("No files found");
    }

    const groups = {};

    files.forEach((file) => {
      if (file.metadata && file.metadata.groupId) {
        const groupId = file.metadata.groupId;
        const brand = file.metadata.brand;
        const model = file.metadata.model;
        const color = file.metadata.color;
        const year = file.metadata.year;
        const bodyType = file.metadata.bodyType;
        const specs = file.metadata.specs;
        const mileage = file.metadata.mileage
        const seats = file.metadata.seats
        const feul = file.metadata.feul
        const transmission = file.metadata.transmission
        const steering = file.metadata.steering
        const trim = file.metadata.trim
        const price = file.metadata.price

        // Check if bodyType is in the list of allowed types
        const allowedBodyTypes = ["Sedan", "Suv", "Truck", "Mini-Van", "Hatchback", "hatchback", "suv", "sedan", "truck","mini-van"];
        if (allowedBodyTypes.includes(bodyType)) {
          // Check if group already exists
          if (!groups[groupId]) {
            groups[groupId] = {
              url: `https://ddauto.up.railway.app/api/post/assets/${file.filename}`,
              brand: brand,
              model: model,
              year: year,
              color: color,
              specs: specs,
              bodyType: bodyType,
              mileage: mileage,
              feul: feul,
              steering: steering,
              transmission: transmission,
              seats: seats,
              price: price,
              trim: trim,
            };
          }
        }
      }
    });

    const urls = Object.entries(groups)
      .slice(0, 10) // Get only the first 15 entries
      .map(([groupId, data]) => ({
        groupId,
        url: data.url,
        brand: data.brand,
        year: data.year,
        color: data.color,
        bodyType: data.bodyType,
        model: data.model,
        specs: data.specs,
        mileage: data.mileage,
        feul: data.feul,
        seats: data.seats,
        transmission: data.transmission,
        steering: data.steering,
        trim: data.trim,
        price: data.price,
      }));

    res.send({ urls })
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
})

router.get("/all/:groupId", async (req, res) => {
  try {
    const groupId = req.params.groupId; // Get the groupId from the URL params
    const files = await gfs.find({ "metadata.groupId": groupId }).toArray();
    // Do files exist for the groupId?
    if (!files || files.length === 0) {
      return res.status(404).send("No files found for the given groupId");
    }

  const urls = files.map((file) =>{

     return {
      url:`https://ddauto.up.railway.app/api/post/assets/${file.filename}`,
      brand: file.metadata.brand,
      color:file.metadata.color,
      model: file.metadata.model,
      year: file.metadata.year,
      bodyType: file.metadata.bodyType,
      specs: file.metadata.specs,
      mileage : file.metadata.mileage,
      seats : file.metadata.seats,
      feul : file.metadata.feul,
      transmission : file.metadata.transmission,
      steering : file.metadata.steering,
      price : file.metadata.price,
    }
  });

    res.send({ urls });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

const ITEMS_PER_PAGE = 20;

router.get("/test", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Get the page number from the query parameter, default to 1 if not provided
    const files = await gfs.find().toArray();

    // Does file exist?
    if (!files || files.length === 0) {
      return res.status(404).send("No files found");
    }

    const groups = {};

    files.forEach((file) => {
      if (file.metadata && file.metadata.groupId) {
        // check if any metadata field is null
        const metadataValues = Object.values(file.metadata);
        if (metadataValues.some((value) => value === null)) {
          return; // skip this file
        }
        const groupId = file.metadata.groupId;
        const brand = file.metadata.brand;
        const model = file.metadata.model;
        const color = file.metadata.color;
        const year = file.metadata.year;
        const bodyType = file.metadata.bodyType;
        const specs = file.metadata.specs;
        const mileage = file.metadata.mileage;
        const seats = file.metadata.seats;
        const feul = file.metadata.feul;
        const transmission = file.metadata.transmission;
        const steering = file.metadata.steering;
        const price = file.metadata.price;
        const trim = file.metadata.trim;
        if (!groups[groupId]) {
          groups[groupId] = {
            url: `https://ddauto.up.railway.app/api/post/assets/${file.filename}`,
            brand: brand,
            model: model,
            year: year,
            color: color,
            specs: specs,
            bodyType: bodyType,
            mileage: mileage,
            feul: feul,
            steering: steering,
            transmission: transmission,
            seats: seats,
            price: price,
            trim: trim,
          };
        }
      }
    });

    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = page * ITEMS_PER_PAGE;
    const paginatedUrls = Object.entries(groups)
      .map(([groupId, data]) => ({
        groupId,
        url: data.url,
        brand: data.brand,
        year: data.year,
        color: data.color,
        bodyType: data.bodyType,
        model: data.model,
        specs: data.specs,
        mileage: data.mileage,
        feul: data.feul,
        seats: data.seats,
        transmission: data.transmission,
        steering: data.steering,
        price: data.price,
        trim: data.trim,
      }))
      .slice(startIndex, endIndex);

    const totalPages = Math.ceil(Object.keys(groups).length / ITEMS_PER_PAGE);
    res.send({ urls: paginatedUrls, totalPages });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});


router.get("/search/:brand", async (req, res) => {
  try {
    const brandQuery = req.params.brand; // Get the brand query from the URL params
    const regex = new RegExp(brandQuery, "i"); // Create a case-insensitive regex for the brand query

    const files = await gfs
      .find({ "metadata.brand": regex })
      .toArray(); // Find files matching the brand query
    if (!files || files.length === 0) {
      return res.status(404).send("No files found");
    }
    const groups = {};

    files.forEach((file) => {
      if (file.metadata && file.metadata.groupId) {
        // check if any metadata field is null
        const metadataValues = Object.values(file.metadata);
        if (metadataValues.some((value) => value === null)) {
          return; // skip this file
        }
        const groupId = file.metadata.groupId;
        const brand = file.metadata.brand;
        const model = file.metadata.model;

        // Check if the brand already exists in the groups object
        if (!groups[brand]) {
          groups[brand] = {
            groupId: groupId,
            url: `https://ddauto.up.railway.app/api/post/assets/${file.filename}`,
            brand: brand,
            model: model,
            // Add other properties here
          };
        }
      }
    });

    const urls = Object.values(groups);

    res.send({ urls });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

router.get("/searchretbrand/:brand", async (req, res) => {
  try {
    const brand = req.params.brand; // Get the brand from the URL params
    const page = parseInt(req.query.page) || 1; // Get the page number from the query parameter, default to 1 if not provided
    const files = await gfs
      .find({ "metadata.brand": brand })
      .toArray();

    // Does file exist?
    if (!files || files.length === 0) {
      return res.status(404).send("No files found");
    }

    const groups = {};

    files.forEach((file) => {
      if (file.metadata && file.metadata.groupId) {
        // check if any metadata field is null
        const metadataValues = Object.values(file.metadata);
        if (metadataValues.some((value) => value === null)) {
          return; // skip this file
        }
        const groupId = file.metadata.groupId;
        const brand = file.metadata.brand;
        const model = file.metadata.model;
        const color = file.metadata.color;
        const year = file.metadata.year;
        const bodyType = file.metadata.bodyType;
        const specs = file.metadata.specs;
        const mileage = file.metadata.mileage;
        const seats = file.metadata.seats;
        const feul = file.metadata.feul;
        const transmission = file.metadata.transmission;
        const steering = file.metadata.steering;
        const price = file.metadata.price;
        const trim = file.metadata.trim;
        if (!groups[groupId]) {
          groups[groupId] = {
            url: `https://ddauto.up.railway.app/api/post/assets/${file.filename}`,
            brand: brand,
            model: model,
            year: year,
            color: color,
            specs: specs,
            bodyType: bodyType,
            mileage: mileage,
            feul: feul,
            steering: steering,
            transmission: transmission,
            seats: seats,
            price: price,
            trim: trim,
          };
        }
      }
    });

    const ITEMS_PER_PAGE = 10;
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = page * ITEMS_PER_PAGE;
    const paginatedUrls = Object.values(groups)
      .slice(startIndex, endIndex);

    const totalPages = Math.ceil(Object.keys(groups).length / ITEMS_PER_PAGE);
    res.send({ urls: paginatedUrls, totalPages });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

  
module.exports = router;