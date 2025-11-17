import axios from 'axios';

export async function registerApi(data){
    try{
        const response = await axios.post("http://127.0.0.1:8000/api/auth/signup/",data);
    }
    catch (error) {
        throw new Error(error?.response?.data?.message || "Something went wrong");
    }
}