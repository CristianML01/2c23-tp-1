import axios, { AxiosResponse } from "axios"
import { ServiceError } from "./errors/service-error.js"
import { Article } from "./dtos/article.js"
import { METRIC_SERVICE, redis } from "../tp1.js"

const SPACE_FLIGHT_ENDPOINT = "https://api.spaceflightnewsapi.net/v3/articles?_limit="
const CACHED_NEWS_KEY = "space_news"

export class SpaceFlightService {
    
    async retrieveSpaceNews(amount: number): Promise<string[]> {
        const start = METRIC_SERVICE.clock.getTime();
        const response = await axios.get<Article[]>(`${SPACE_FLIGHT_ENDPOINT}${amount}`)
        const end = METRIC_SERVICE.clock.getTime();
        METRIC_SERVICE.statsClient.timing("space.endpoint_time", end - start)
        this.sanitizeArticles(response)
        return this.extractTitles(response.data)
    }

    async retrieveSpaceNewsCached(amount: number): Promise<string[]> {
        let cached_news = await redis.get(CACHED_NEWS_KEY);
        if (cached_news === null) {
            console.log("SPACE_NEWS NOT FOUND IN CACHE - REFRESHING...")
            const news = await this.retrieveSpaceNews(amount);
            await redis.set(CACHED_NEWS_KEY, JSON.stringify(news), {EX: 60})
            return news;
        }
        console.log("USING CACHE FOR SPACE_NEWS")
        return JSON.parse(cached_news);
    }

    private extractTitles(articles: Article[]): string[] {
        const titles: string[] = []
        articles.forEach(a => titles.push(a.title))
        return titles;
    }


    private sanitizeArticles(articleResponse: AxiosResponse<Article[], any>) {
        if (!Object.hasOwn(articleResponse, 'data')) {
            throw new ServiceError(400, "Failed to retrieve SpaceFlightNews...")
        }
    } 

}