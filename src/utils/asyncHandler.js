              //H.O.F (higher order function)=>utility function

//wrapper function which can be used anywhere
const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).
    catch((err) => next(err));
  };
};


export { asyncHandler };




// const asyncHandler = (fn) => async (req,res,next) 
//=> {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success:true,
//             message:err.message
//         })
//     }
// };
