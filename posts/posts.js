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
      const id = new mongoose.Types.ObjectId();
      
      if (!groupId) {
        groupId = uuidv4();
      }
        return {
          id,
          filename: `${id}-${filename}${path.extname(file.originalname)}`,
          bucketName: "uploads",
          metadata: {
            groupId,
            brand: req.body.brand,
            year: req.body.year,
            color: req.body.color,
            bodyType: req.body.bodyType,
            model: req.body.model,
            specs: req.body.specs,
            seats: req.body.seats,
            mileage: req.body.mileage,
            feul: req.body.feul,
            trim: req.body.trim,
            transmission: req.body.transmission,
            steering: req.body.steering,
            price: req.body.price
          },
        };
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
            url: `https://ddbackend-hctu.onrender.com/api/post/assets/${file.filename}`,
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
              url: `https://ddbackend-hctu.onrender.com/api/post/assets/${file.filename}`,
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

    const urls = files.map((file) => {
      const url = `https://ddbackend-hctu.onrender.com/api/post/assets/${file.filename}`;
      const metadata = file.metadata;

      const data = {
        brand: metadata.brand ? metadata.brand[0] : "",
        color: metadata.color ? metadata.color[0] : "",
        model: metadata.model ? metadata.model[0] : "",
        year: metadata.year ? metadata.year[0] : "",
        bodyType: metadata.bodyType ? metadata.bodyType[0] : "",
        specs: metadata.specs ? metadata.specs[0] : "",
        mileage: metadata.mileage ? metadata.mileage[0] : "",
        seats: metadata.seats ? metadata.seats[0] : "",
        feul: metadata.feul ? metadata.feul[0] : "",
        transmission: metadata.transmission ? metadata.transmission[0] : "",
        steering: metadata.steering ? metadata.steering[0] : "",
        price: metadata.price ? metadata.price[0] : "",
        price: metadata.price ? metadata.trim[0] : ""
      };

      return {
        url,
        ...data
      };
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
            url: `https://ddbackend-hctu.onrender.com/api/post/assets/${file.filename}`,
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
        brand: data.brand[0],
        year: data.year[0],
        color: data.color[0],
        bodyType: data.bodyType[0],
        model: data.model[0],
        specs: data.specs[0],
        mileage: data.mileage[0],
        feul: data.feul[0],
        seats: data.seats[0],
        transmission: data.transmission[0],
        steering: data.steering[0],
        price: data.price[0],
        trim: data.trim[0],
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
    let secondGroup = null; // Variable to store the second group
    files.forEach((file) => {
      if (file.metadata && file.metadata.groupId) {
        // check if any metadata field is null
        const metadataValues = Object.values(file.metadata);
        if (metadataValues.some((value) => value === null)) {
          return; // skip this file
        }
        const groupId = file.metadata.groupId;
        const brand = file.metadata.brand[0];
        const model = file.metadata.model[0];
        // Check if the brand already exists in the groups object
        if (!secondGroup) {
          secondGroup = {
            groupId: groupId,
            url: `https://ddbackend-hctu.onrender.com/api/post/assets/${file.filename}`,
            brand: brand,
            model: model,
            // Add other properties here
          };
        }
      }
    });
    if (!secondGroup) {
      return res.status(404).send("No files found");
    }
    res.send({ urls: [secondGroup] });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});




router.get("/searchretbrand/:brand", async (req, res) => {
  try {
    const brand = req.params.brand; // Get the brand from the URL params
    const page = parseInt(req.query.page) || 1; // Get the page number from the query parameter, default to 1 if not provided
    const files = await gfs.find({ "metadata.brand": brand }).toArray();

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

        // Corrected variable names
        const data = {
          brand: file.metadata.brand,
          year: file.metadata.year,
          color: file.metadata.color,
          bodyType: file.metadata.bodyType,
          model: file.metadata.model,
          specs: file.metadata.specs,
          mileage: file.metadata.mileage,
          feul: file.metadata.feul,
          seats: file.metadata.seats,
          transmission: file.metadata.transmission,
          steering: file.metadata.steering,
          price: file.metadata.price,
          trim: file.metadata.trim,
        };

        if (!groups[groupId]) {
          groups[groupId] = {
            url: `https://ddbackend-hctu.onrender.com/api/post/assets/${file.filename}`,
            groupId,
            brand: data.brand[0],
            year: data.year[0],
            color: data.color[0],
            bodyType: data.bodyType[0],
            model: data.model[0],
            specs: data.specs[0],
            mileage: data.mileage[0],
            feul: data.feul[0],
            seats: data.seats[0],
            transmission: data.transmission[0],
            steering: data.steering[0],
            price: data.price[0],
            trim: data.trim[0],
          };
        }
      }
    });

    const ITEMS_PER_PAGE = 25;
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = page * ITEMS_PER_PAGE;
    const paginatedUrls = Object.values(groups).slice(startIndex, endIndex);

    const totalPages = Math.ceil(Object.keys(groups).length / ITEMS_PER_PAGE);
    res.send({ urls: paginatedUrls, totalPages });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

  
module.exports = router;